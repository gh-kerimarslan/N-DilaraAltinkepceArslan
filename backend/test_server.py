import unittest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch
import server

class SignalsTest(unittest.TestCase):
    def setUp(self):
        self.at = datetime(2026,11,17,12,tzinfo=timezone.utc)
        self.config = {'value_path':['value'], 'time_path':['observedAt'], 'source_label':'Fixture', 'metric_label':'test units', 'max_age_seconds':3600, 'direction':'above', 'watch_threshold':5, 'alarm_threshold':10}
    def payload(self, value, age=0):
        return {'value':value,'observedAt':(self.at-timedelta(seconds=age)).isoformat()}
    def test_boundaries(self):
        for value, state in [(4,'normal'),(5,'watch'),(10,'alarm')]:
            self.assertEqual(server.evaluate(self.payload(value),self.config,self.at)['state'],state)
    def test_below_direction(self):
        c={**self.config,'direction':'below','watch_threshold':10,'alarm_threshold':5}
        for value,state in [(11,'normal'),(10,'watch'),(5,'alarm')]:
            self.assertEqual(server.evaluate(self.payload(value),c,self.at)['state'],state)
    def test_stale_measurement_cannot_be_clear(self):
        self.assertEqual(server.evaluate(self.payload(0,3601),self.config,self.at)['state'],'stale')
    def test_invalid_input(self):
        for value in [True,'3',None,float('nan'),float('inf')]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                server.evaluate(self.payload(value),self.config,self.at)
    def test_missing_timestamp(self):
        with self.assertRaises(KeyError):server.evaluate({'value':3},self.config,self.at)
    def test_future_timestamp(self):
        with self.assertRaises(ValueError):server.evaluate(self.payload(0,-301),self.config,self.at)
    def test_threshold_ordering(self):
        with self.assertRaises(ValueError):server.evaluate(self.payload(0),{**self.config,'alarm_threshold':3},self.at)
    def test_disabled_feed_never_fetches(self):
        with patch('server.fetch_feed') as fetch:
            self.assertEqual(server.collect({'enabled':False})['state'],'unknown');fetch.assert_not_called()
    def test_source_failure(self):
        with patch('server.fetch_feed',side_effect=ValueError('secret-url')):
            result=server.collect({**self.config,'enabled':True,'url':'https://example.com'})
        self.assertEqual(result['state'],'unknown');self.assertNotIn('secret',str(result))
    def test_non_allowlisted_source(self):
        for url in ['http://example.com','https://127.0.0.1','https://169.254.169.254','https://unconfigured.example']:
            with self.subTest(url=url),self.assertRaises(ValueError):server.fetch_feed(url)
    def test_invalid_source_configuration(self):
        self.assertEqual(server.collect(None)['state'],'unknown')
    def test_read_only_api_and_cors(self):
        def request(method,path,origin):
            captured={}
            def start(code,headers):captured.update(code=code,headers=dict(headers))
            body=b''.join(server.app({'REQUEST_METHOD':method,'PATH_INFO':path,'HTTP_ORIGIN':origin},start))
            return captured,body
        response,body=request('GET','/health','https://dilaraaltinkepcearslan.com')
        self.assertEqual(response['code'],'200 OK')
        self.assertEqual(response['headers']['Access-Control-Allow-Origin'],'https://dilaraaltinkepcearslan.com')
        response,_=request('GET','/health','https://untrusted.example')
        self.assertNotIn('Access-Control-Allow-Origin',response['headers'])
        response,_=request('POST','/v1/status','')
        self.assertEqual(response['code'],'405 Method Not Allowed')
        _,body=request('HEAD','/health','')
        self.assertEqual(body,b'')
if __name__=='__main__':unittest.main()
