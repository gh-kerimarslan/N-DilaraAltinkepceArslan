from datetime import datetime, timezone
import json,os,unittest
from unittest.mock import patch
import hourly_snapshot

class HourlySnapshotTest(unittest.TestCase):
    def test_default_sources_are_unknown(self):
        with patch.dict(os.environ,{'ALARM_CHANNELS_JSON':''}):
            data=hourly_snapshot.snapshot()
        self.assertEqual(set(data['channels']),set(hourly_snapshot.server.CHANNELS))
        self.assertTrue(all(x['state']=='unknown' for x in data['channels'].values()))
    def test_one_configured_source_does_not_clear_missing_channels(self):
        source={'enabled':True,'url':'https://fixture.invalid/feed','value_path':['value'],'time_path':['observedAt'],'source_label':'Fixture','metric_label':'test units','max_age_seconds':7200,'watch_threshold':5,'alarm_threshold':10,'direction':'above'}
        payload={'value':11,'observedAt':datetime.now(timezone.utc).isoformat()}
        with patch.dict(os.environ,{'ALARM_CHANNELS_JSON':json.dumps({'channels':{'moloch':source}})}),patch('server.fetch_feed',return_value=payload):
            data=hourly_snapshot.snapshot()
        self.assertEqual(data['channels']['moloch']['state'],'alarm')
        self.assertEqual(data['channels']['gorilla']['state'],'unknown')
    def test_invalid_config_is_rejected(self):
        with patch.dict(os.environ,{'ALARM_CHANNELS_JSON':'{"channels":[]}'}),self.assertRaises(ValueError):
            hourly_snapshot.snapshot()

if __name__=='__main__':unittest.main()
