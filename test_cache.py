import urllib.request
import json
import time

def run_test():
    print("--- 1. Initial Cache Stats ---", flush=True)
    req = urllib.request.urlopen('http://localhost:8088/api/cache/stats')
    stats = json.loads(req.read().decode('utf-8'))
    print(json.dumps(stats, indent=2), flush=True)

    print("\n--- 2. First Query (Cache MISS) ---", flush=True)
    t0 = time.time()
    req1 = urllib.request.urlopen('http://localhost:8088/api/federated?source=all_global&q=deep+learning&rows=6')
    data1 = json.loads(req1.read().decode('utf-8'))
    t1 = (time.time() - t0) * 1000
    print(f"Items: {len(data1.get('items', []))} | Total: {data1.get('total', 0)} | Time: {t1:.1f}ms | Cached: {data1.get('cached')}", flush=True)

    print("\n--- 3. Second Query (Cache HIT) ---", flush=True)
    t0 = time.time()
    req2 = urllib.request.urlopen('http://localhost:8088/api/federated?source=all_global&q=deep+learning&rows=6')
    data2 = json.loads(req2.read().decode('utf-8'))
    t2 = (time.time() - t0) * 1000
    print(f"Items: {len(data2.get('items', []))} | Total: {data2.get('total', 0)} | Time: {t2:.1f}ms | Cached: {data2.get('cached')}", flush=True)

    print("\n--- 4. Test Single Source Fallback & Cache ---", flush=True)
    t0 = time.time()
    req3 = urllib.request.urlopen('http://localhost:8088/api/federated?source=scopus&q=robotics&rows=5')
    data3 = json.loads(req3.read().decode('utf-8'))
    t3 = (time.time() - t0) * 1000
    print(f"Scopus Items: {len(data3.get('items', []))} | Time: {t3:.1f}ms", flush=True)

    t0 = time.time()
    req4 = urllib.request.urlopen('http://localhost:8088/api/federated?source=scopus&q=robotics&rows=5')
    data4 = json.loads(req4.read().decode('utf-8'))
    t4 = (time.time() - t0) * 1000
    print(f"Scopus HIT Items: {len(data4.get('items', []))} | Time: {t4:.1f}ms", flush=True)

    print("\n--- 5. Test Topics Autocomplete Cache ---", flush=True)
    t0 = time.time()
    req5 = urllib.request.urlopen('http://localhost:8088/api/topics?q=quantum')
    data5 = json.loads(req5.read().decode('utf-8'))
    t5 = (time.time() - t0) * 1000
    print(f"Topics Count: {len(data5.get('topics', []))} | Time: {t5:.1f}ms", flush=True)

    t0 = time.time()
    req6 = urllib.request.urlopen('http://localhost:8088/api/topics?q=quantum')
    data6 = json.loads(req6.read().decode('utf-8'))
    t6 = (time.time() - t0) * 1000
    print(f"Topics HIT Count: {len(data6.get('topics', []))} | Time: {t6:.1f}ms", flush=True)

    print("\n--- 6. Final Cache Stats ---", flush=True)
    req = urllib.request.urlopen('http://localhost:8088/api/cache/stats')
    stats = json.loads(req.read().decode('utf-8'))
    print(json.dumps(stats, indent=2), flush=True)

if __name__ == '__main__':
    run_test()
