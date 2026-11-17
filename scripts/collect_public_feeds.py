"""ALARM: five bounded public-source samples. No alarm thresholds or LLM judgments.

Runs once in GitHub Actions, publishes a small JSON snapshot to alarm-data.
Source scope, units, sample timestamps and limitations travel with every record.
"""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.parse import urlencode, urlsplit
import argparse, base64, csv, io, json, math, os, re, urllib.request, urllib.error, zipfile

ROOT=Path(__file__).resolve().parent.parent
CATALOG=json.loads((ROOT/'alarm/data/sources.json').read_text())
HEADERS={'User-Agent':'ALARM-Artwork/1.0 (https://dilaraaltinkepcearslan.com; info@dilaraaltinkepcearslan.com)','Accept':'application/json,text/plain,application/zip'}
ALLOWED={'api.open-meteo.com','api.energy-charts.info','api.safecast.org','en.wikipedia.org','data.gdeltproject.org'}
def utcnow(): return datetime.now(timezone.utc)
def stamp(dt): return dt.astimezone(timezone.utc).isoformat().replace('+00:00','Z')
def date(value): return datetime.fromisoformat(value.replace('Z','+00:00')).astimezone(timezone.utc)
def get(url, limit=4_000_000):
    parsed=urlsplit(url)
    if parsed.scheme!='https' or parsed.hostname not in ALLOWED: raise ValueError('Source host not allowed')
    with urllib.request.urlopen(urllib.request.Request(url,headers=HEADERS),timeout=25) as response:
        if urlsplit(response.url).hostname not in ALLOWED: raise ValueError('Unexpected source redirect')
        data=response.read(limit+1)
    if len(data)>limit: raise ValueError('Source response too large')
    return data
def api(url): return json.loads(get(url))
def finite(value):
    if isinstance(value,bool) or not isinstance(value,(int,float)) or not math.isfinite(value): raise ValueError('Invalid numeric source value')
    return float(value)
def record(key,value,observed,unit,scope,detail,max_age=7200):
    value=finite(value);observed=date(observed);age=(utcnow()-observed).total_seconds()
    if age < -300: raise ValueError('Future source record')
    return {'state':'stale' if age>max_age else 'unknown','value':value,'observedAt':stamp(observed),'collectedAt':stamp(utcnow()),'sourceLabel':CATALOG[key]['source'],'metricLabel':CATALOG[key]['metric'],'sourceUrl':CATALOG[key]['url'],'unit':unit,'scope':scope,'maxAgeSeconds':max_age,'reason':detail+' Alarm eşikleri henüz tanımlanmadı.','thresholdsEnabled':False}
def moloch():
    q=urlencode({'latitude':41.0082,'longitude':28.9784,'hourly':'soil_moisture_0_to_1cm','forecast_days':1,'timezone':'UTC'})
    d=api('https://api.open-meteo.com/v1/forecast?'+q);now=utcnow()
    pairs=[(date(t+'Z'),v) for t,v in zip(d['hourly']['time'],d['hourly']['soil_moisture_0_to_1cm']) if date(t+'Z')<=now and v is not None]
    at,value=max(pairs,key=lambda x:x[0])
    return record('moloch',value,stamp(at),'m³/m³',CATALOG['moloch']['scope'],'Saatlik meteorolojik model çıktısı; bir sensör ölçümü veya küresel kuraklık endeksi değildir.')
def cheetah():
    d=api('https://api.energy-charts.info/public_power?country=de')
    load=next(s for s in d['production_types'] if s['name']=='Load');now=utcnow().timestamp()
    pairs=[(t,v) for t,v in zip(d['unix_seconds'],load['data']) if t<=now and v is not None]
    at,value=max(pairs,key=lambda x:x[0])
    return record('cheetah',value,stamp(datetime.fromtimestamp(at,timezone.utc)),'MW',CATALOG['cheetah']['scope'],'Almanya elektrik yükü; küresel veya toplam tüketim ölçümü değildir.',14400)
def cockroach():
    since=stamp(utcnow()-timedelta(hours=2))
    d=api('https://api.safecast.org/measurements.json?'+urlencode({'per_page':100,'since':since}))
    records=[x for x in d if x.get('captured_at') and x.get('unit') in ['cpm','usv','usv/h'] and isinstance(x.get('value'),(int,float)) and date(x['captured_at'])<=utcnow()+timedelta(minutes=5)]
    x=max(records,key=lambda x:date(x['captured_at']))
    unit={'usv':'µSv/h','usv/h':'µSv/h','cpm':'CPM'}[x['unit']]
    # Coordinates are rounded; contributor identity is never republished.
    scope=f"Örneklemdeki tek sensör kaydı · {round(float(x['latitude']),2)}°, {round(float(x['longitude']),2)}°"
    return record('cockroach',x['value'],x['captured_at'],unit,scope,'Son iki saatteki en fazla 100 kaynak kaydından seçilen örnek. Cihazlar karşılaştırılmaz; sağlık veya güvenlik kararı üretilmez.',7200)
def raven():
    q=urlencode({'action':'query','list':'recentchanges','rclimit':50,'rcprop':'timestamp|flags','rctype':'edit|new','format':'json'})
    d=api('https://en.wikipedia.org/w/api.php?'+q);items=d['query']['recentchanges'];times=[date(x['timestamp']) for x in items]
    seconds=max((max(times)-min(times)).total_seconds(),1)
    value=round((len(items)-1)/seconds*60,2)
    return record('raven',value,stamp(max(times)),'kayıt/dk',f'İngilizce Wikipedia · {len(items)} kayıt / {round(seconds)} saniyelik örneklem','Son düzenlemelerin örneklem temposu. Yanlış bilgi, doğruluk veya cehalet puanı değildir.',7200)
def gorilla():
    meta=get('https://data.gdeltproject.org/gdeltv2/lastupdate.txt',20000).decode()
    line=next(line for line in meta.splitlines() if line.endswith('.export.CSV.zip'))
    url=line.split()[-1]
    match=re.fullmatch(r'https?://data\.gdeltproject\.org/gdeltv2/(\d{14})\.export\.CSV\.zip',url)
    if not match: raise ValueError('Unexpected GDELT export')
    body=get('https://data.gdeltproject.org/gdeltv2/'+match[1]+'.export.CSV.zip')
    with zipfile.ZipFile(io.BytesIO(body)) as archive:
        files=archive.infolist()
        if len(files)!=1 or files[0].file_size>12_000_000: raise ValueError('Oversized GDELT archive')
        data=archive.read(files[0]).decode('utf-8')
    rows=list(csv.reader(io.StringIO(data),delimiter='\t'))
    valid=[r for r in rows if len(r)==61]
    if not valid: raise ValueError('No valid GDELT event records')
    count=sum(1 for r in valid if r[28] in ['19','20'])
    at=datetime.strptime(match[1],'%Y%m%d%H%M%S').replace(tzinfo=timezone.utc)
    return record('gorilla',count,stamp(at),'kayıt',f'GDELT 2.0 · son dosyada {len(valid)} olay kaydı','Olay kodu 19/20 olan kayıt sayısı. Benzersiz olay, mağdur veya insani değer ölçümü değildir.',7200)
COLLECTORS={'moloch':moloch,'cheetah':cheetah,'cockroach':cockroach,'raven':raven,'gorilla':gorilla}
def publish(payload):
    repo=os.environ.get('GITHUB_REPOSITORY','');token=os.environ.get('GITHUB_TOKEN','')
    if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+',repo) or not token:raise ValueError('Repository-scoped publication required')
    def request(path,method='GET',data=None,missing=False):
        body=None if data is None else json.dumps(data).encode()
        req=urllib.request.Request('https://api.github.com/repos/'+repo+path,data=body,method=method,headers={'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json','User-Agent':'ALARM-Public-Observations'})
        try:
            with urllib.request.urlopen(req,timeout=20)as response:return json.load(response)
        except urllib.error.HTTPError as error:
            if missing and error.code==404:return None
            raise RuntimeError('Snapshot publication failed: HTTP '+str(error.code)) from None
    if request('').get('private') is not False:raise ValueError('Public snapshots require a public repository')
    text=json.dumps(payload,ensure_ascii=False,indent=2,allow_nan=False)
    branch=request('/git/ref/heads/alarm-data',missing=True)
    if branch is None:
        tree=request('/git/trees','POST',{'tree':[{'path':'alarm/data/status.json','mode':'100644','type':'blob','content':text}]})
        commit=request('/git/commits','POST',{'message':'Start ALARM public observation feed','tree':tree['sha'],'parents':[]})
        request('/git/refs','POST',{'ref':'refs/heads/alarm-data','sha':commit['sha']})
    else:
        previous=request('/contents/alarm/data/status.json?ref=alarm-data',missing=True)
        data={'message':'Update ALARM public observations','branch':'alarm-data','content':base64.b64encode(text.encode()).decode()}
        if previous:data['sha']=previous['sha']
        request('/contents/alarm/data/status.json','PUT',data)
def collect_one(item):
    key,fn=item
    try: result=fn()
    except Exception as error:
        # Do not republish provider error bodies or pretend a failed sample is current.
        result={'state':'unknown','value':None,'observedAt':None,'collectedAt':stamp(utcnow()),'sourceLabel':CATALOG[key]['source'],'sourceUrl':CATALOG[key]['url'],'metricLabel':CATALOG[key]['metric'],'unit':'','scope':CATALOG[key]['scope'],'maxAgeSeconds':7200,'thresholdsEnabled':False,'reason':'Bu çağrıda geçerli bir kaynak kaydı alınamadı. Bir sonraki çevrimde yeniden denenecek.','errorType':type(error).__name__}
    return key,result
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,required=True);parser.add_argument('--publish',action='store_true');args=parser.parse_args()
    with ThreadPoolExecutor(max_workers=5) as pool: channels=dict(pool.map(collect_one,COLLECTORS.items()))
    payload={'schemaVersion':1,'generatedAt':stamp(utcnow()),'refreshSeconds':1200,'thresholdsEnabled':False,'channels':channels}
    args.output.parent.mkdir(parents=True,exist_ok=True);temp=args.output.with_suffix('.tmp');temp.write_text(json.dumps(payload,ensure_ascii=False,indent=2));temp.replace(args.output)
    if args.publish:publish(payload)
    print(json.dumps({key:{'state':v['state'],'available':v['value'] is not None}for key,v in channels.items()}))
if __name__=='__main__':main()
