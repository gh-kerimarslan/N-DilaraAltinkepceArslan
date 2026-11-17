import unittest
from datetime import timedelta
from collect_public_feeds import record, finite, utcnow, stamp, get

class PublicFeedTest(unittest.TestCase):
    def test_measurements_cannot_enable_alarms(self):
        result=record('moloch',.25,stamp(utcnow()),'m³/m³','test scope','model')
        self.assertEqual(result['state'],'unknown')
        self.assertFalse(result['thresholdsEnabled'])
        self.assertEqual(result['value'],.25)
    def test_old_data_is_explicitly_stale(self):
        result=record('moloch',.25,stamp(utcnow()-timedelta(days=2)),'m³/m³','test','model')
        self.assertEqual(result['state'],'stale')
    def test_future_or_nonfinite_readings_are_rejected(self):
        for value in [True,float('nan'),float('inf'),'25']:
            with self.assertRaises(ValueError):finite(value)
        with self.assertRaises(ValueError):record('moloch',.25,stamp(utcnow()+timedelta(hours=2)),'m³/m³','test','model')
    def test_arbitrary_sources_never_make_network_calls(self):
        for url in ['http://api.open-meteo.com/','https://127.0.0.1/','https://example.com/']:
            with self.assertRaises(ValueError):get(url)

if __name__=='__main__':unittest.main()
