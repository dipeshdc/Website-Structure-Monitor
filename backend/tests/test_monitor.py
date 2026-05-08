from app.monitor import compute_hash, extract_structure


def test_extract_structure_missing() -> None:
    structure, missing = extract_structure("", None)
    assert structure is None
    assert missing is True


def test_extract_structure_body() -> None:
    html = "<html><body><div id='a'></div><span class='x'></span></body></html>"
    structure, missing = extract_structure(html, None)
    assert missing is False
    assert "div[id]" in structure
    assert "span[class]" in structure


def test_hash_changes() -> None:
    h1 = compute_hash("a|b|c")
    h2 = compute_hash("a|b|c")
    h3 = compute_hash("a|b|d")
    assert h1 == h2
    assert h1 != h3
