import urllib.request
import urllib.error

url = "http://localhost:8001/api/images/9/rerun-detection"
req = urllib.request.Request(url, method="POST")

try:
    with urllib.request.urlopen(req) as response:
        print("Status:", response.status)
        print("Body:", response.read().decode())
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code, e.reason)
    print("Body:", e.read().decode())
except Exception as e:
    print("Error:", str(e))
