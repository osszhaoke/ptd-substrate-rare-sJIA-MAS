"""One complete, fictional state performance window; no product changes or real OCR."""
import argparse,datetime,json,os,platform,threading,uuid
from pathlib import Path
from tools.run_browser import ROOT,run
from tools.verify_debt import fingerprint
from gateway.server import Server
from gateway.ocr import Configuration

def environment():
    return {'timeUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'system':platform.platform(),'python':platform.python_version(),
            'logicalCPUs':os.cpu_count(),'loadAverage':os.getloadavg()}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,required=True);args=parser.parse_args()
    out=ROOT/args.output;out.mkdir(parents=True,exist_ok=False)
    binding=fingerprint();profile=str(uuid.uuid4())
    result={'ok':False,'identity':'author fictional Mac WebKit diagnostic window; not independent or phone acceptance',
            'binding':binding,'profile':profile,'checks':[],
            'paidProviderCalls':0,'uniqueCause':'NOT_ESTABLISHED',
            'limits':'Instrumentation overhead is included; IDB native work/clone/scheduling are not separable. Successful rerun does not erase prior failures.'}
    server=Server(('127.0.0.1',0),ROOT/'web',out/'unused-budget.json',Configuration({}))
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    url=f'http://127.0.0.1:{server.server_address[1]}/'
    def measure(name,case,target):
        (out/(name+'.environment-before.json')).write_text(json.dumps(environment(),indent=2)+'\n')
        try:
            config={'profile':profile,'target':str(target)}
            if case=='state-scale':config['diagnostics']='yes'
            data=run(case,out/name,config,url)
            if case=='state-scale':
                assert len(data['diagnostics'])==14,'DIAGNOSTIC_SAMPLE_MISSING'
                for sample in data['diagnostics']:
                    if sample['kind']=='cold':
                        assert len(sample['snapshotMs'])==1 and len(sample['metaReadMs'])==2,'DIAGNOSTIC_PATH_MISSING'
                        assert sample['idbGetAllDispatchMs'] and sample['projectionAndContinuationMs']>=0,'DIAGNOSTIC_STAGES_MISSING'
                    else:assert not sample['snapshotMs'] and len(sample['metaReadMs'])==1,'WARM_CACHE_PATH_CHANGED'
            if case=='backup-scale':assert data['heartbeatP95Ms']<=250 and data['maxCryptoBytes']<=262145,'BACKUP_TARGET_NOT_MET'
            result['checks'].append({'name':name,'ok':True})
        finally:
            (out/(name+'.environment-after.json')).write_text(json.dumps(environment(),indent=2)+'\n')
    try:
        for target in [1000,3000,6000,10000]:
            measure('state-'+str(target),'state-scale',target)
            if target in [1000,10000]:
                measure('consult-'+str(target),'consult-scale',target)
                measure('backup-'+str(target),'backup-scale',target)
        assert fingerprint()==binding,'SOURCE_CHANGED_DURING_DIAGNOSIS'
        result['ok']=True
    except BaseException as error:
        result['failure']={'type':type(error).__name__,'message':str(error)}
        raise
    finally:
        server.shutdown();server.server_close();thread.join(timeout=5)
        (out/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'ok':True,'checks':len(result['checks']),'profile':profile,'result':str(out/'result.json')}),flush=True)

if __name__=='__main__':main()
