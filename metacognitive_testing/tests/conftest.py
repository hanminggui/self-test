import pytest
import os

@pytest.fixture(autouse=True)
def isolate_test_persistence(tmp_path, monkeypatch):
    """
    Ensure all automated tests store session artifacts in an isolated temporary directory,
    preventing unit tests from polluting the genuine human production data repository.
    """
    test_data_dir = str(tmp_path / "data")
    monkeypatch.setenv("METACOGNITIVE_DATA_DIR", test_data_dir)
