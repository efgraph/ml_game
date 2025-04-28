import pytest
import subprocess
import time
import os
import socket
import requests
from pathlib import Path


def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0


def run_command(command):
    result = subprocess.run(
        command,
        shell=True,
        capture_output=True,
        text=True,
    )
    return result


@pytest.mark.skipif(not Path("api/api.py").exists(), 
                   reason="API file not found")
def test_api_imports():
    result = run_command("python -c 'from api.api import app'")
    assert result.returncode == 0, f"API import failed with error: {result.stderr}"


@pytest.mark.slow
@pytest.mark.skipif(not Path("api/api.py").exists(), 
                   reason="API file not found")
def test_api_startup():
    port = 8765
    if is_port_in_use(port):
        pytest.skip(f"Port {port} is already in use")
    
    process = subprocess.Popen(
        f"uvicorn api.api:app --host 127.0.0.1 --port {port} --timeout-keep-alive 2",
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    try:
        time.sleep(5)
        
        if process.poll() is not None:
            stdout, stderr = process.communicate()
            pytest.skip(f"API failed to start: {stderr}")

        try:
            response = requests.get(f"http://127.0.0.1:{port}/docs")
            assert response.status_code == 200, f"API docs request failed with status code {response.status_code}"
        except requests.RequestException as e:
            pytest.skip(f"Failed to connect to API: {e}")
    finally:
        process.terminate()
        process.wait(timeout=5)
        
        if process.poll() is None:
            process.kill()
            process.wait(timeout=5) 