"""Collect configured public artwork signals, then publish a small JSON snapshot.

Local: python3 scripts/hourly_snapshot.py --output /tmp/alarm-status.json
Actions: add --publish; token must be the ephemeral repository GITHUB_TOKEN.
No model, server, photo upload or paid cloud service is required.
"""
from pathlib import Path
import argparse,base64,json,os,re,sys,urllib.error,urllib.request
sys.path.insert(0,str(Path(__file__).resolve().parent.parent/'backend'))
import server

def snapshot():
    raw=os.environ.get('ALARM_CHANNELS_JSON','')
    if raw:
        config=json.loads(raw)
        if not isinstance(config,dict) or not isinstance(config.get('channels'),dict):
            raise ValueError('Invalid channel configuration')
        feeds=config['channels']
        from concurrent.futures import ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=5) as pool:
            values=list(pool.map(lambda channel:server.collect(feeds.get(channel,{})),server.CHANNELS))
        return {'schemaVersion':1,'generatedAt':server.iso(server.now()),'channels':dict(zip(server.CHANNELS,values))}
    return server.status()

def publish(data):
    repo=os.environ.get('GITHUB_REPOSITORY','')
    token=os.environ.get('GITHUB_TOKEN','')
    if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+',repo) or not token:
        raise ValueError('Repository-scoped GitHub connection required')
    api='https://api.github.com/repos/'+repo
    def request(path,method='GET',payload=None,missing=False):
        body=None if payload is None else json.dumps(payload).encode()
        req=urllib.request.Request(api+path,data=body,method=method,headers={'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'ALARM-Hourly-Signal','Content-Type':'application/json'})
        try:
            with urllib.request.urlopen(req,timeout=20) as response:return json.load(response)
        except urllib.error.HTTPError as error:
            if missing and error.code==404:return None
            raise RuntimeError('GitHub snapshot publication failed (HTTP '+str(error.code)+')') from None
    meta=request('')
    if meta.get('private') is not False:
        raise ValueError('Raw public snapshots require a public repository; repository visibility was not changed')
    branch=request('/git/ref/heads/alarm-data',missing=True)
    if branch is None:
        default=meta['default_branch']
        if not re.fullmatch(r'[A-Za-z0-9_./-]+',default):raise ValueError('Invalid default branch')
        ref=request('/git/ref/heads/'+default)
        request('/git/refs','POST',{'ref':'refs/heads/alarm-data','sha':ref['object']['sha']})
    path='/contents/alarm/data/status.json'
    previous=request(path+'?ref=alarm-data',missing=True)
    payload={'message':'Update ALARM public observation snapshot','branch':'alarm-data','content':base64.b64encode(json.dumps(data,ensure_ascii=False,indent=2,allow_nan=False).encode()).decode()}
    if previous is not None:payload['sha']=previous['sha']
    request(path,'PUT',payload)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--publish',action='store_true');parser.add_argument('--output',type=Path);args=parser.parse_args()
    data=snapshot()
    if args.output:
        args.output.parent.mkdir(parents=True,exist_ok=True)
        args.output.write_text(json.dumps(data,indent=2,allow_nan=False))
    if args.publish:publish(data)
    print(json.dumps({'generatedAt':data['generatedAt'],'channels':{key:value['state'] for key,value in data['channels'].items()},'published':args.publish}))
if __name__=='__main__':
    try:main()
    except Exception as error:
        # A configured source URL or secret must never enter an Actions log.
        print('ALARM snapshot failed: '+type(error).__name__,file=sys.stderr);sys.exit(1)
