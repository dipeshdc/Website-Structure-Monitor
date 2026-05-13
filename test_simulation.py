#!/usr/bin/env python3
"""Simulate content change detection."""

from backend.app.monitor import extract_structure, compute_hash

# Test case 1: HTML with test content visible
html_with_content = """
<html>
<body>
    <main>
        <section class="test-section">
            <div class="test-card">
                <h2>Test Controls</h2>
                <div class="test-content">
                    <div class="test-section-item">
                        <h3>Test Section A</h3>
                        <p>Always visible test element.</p>
                    </div>
                    <div class="test-section-item">
                        <h3>Test Section B</h3>
                        <p>Toggle to hide/show this section.</p>
                    </div>
                </div>
            </div>
        </section>
    </main>
</body>
</html>
"""

# Test case 2: Same HTML but test content removed (Section B removed)
html_without_content = """
<html>
<body>
    <main>
        <section class="test-section">
            <div class="test-card">
                <h2>Test Controls</h2>
                <div class="test-content">
                    <div class="test-section-item">
                        <h3>Test Section A</h3>
                        <p>Always visible test element.</p>
                    </div>
                </div>
            </div>
        </section>
    </main>
</body>
</html>
"""

print("=" * 60)
print("BEFORE Content Removal (Section B visible)")
print("=" * 60)
structure1, missing1 = extract_structure(html_with_content, None)
hash1 = compute_hash(structure1)
print(f"Structure length: {len(structure1) if structure1 else 0}")
print(f"Structure (first 300 chars): {str(structure1)[:300] if structure1 else 'None'}")
print(f"Missing data: {missing1}")
print(f"Hash: {hash1}")

print("\n" + "=" * 60)
print("AFTER Content Removal (Section B removed)")
print("=" * 60)
structure2, missing2 = extract_structure(html_without_content, None)
hash2 = compute_hash(structure2)
print(f"Structure length: {len(structure2) if structure2 else 0}")
print(f"Structure (first 300 chars): {str(structure2)[:300] if structure2 else 'None'}")
print(f"Missing data: {missing2}")
print(f"Hash: {hash2}")

print("\n" + "=" * 60)
print("DETECTION RESULT")
print("=" * 60)
print(f"Hashes are different: {hash1 != hash2}")
print(f"Change detected: {hash1 != hash2}")
if hash1 == hash2:
    print("\n⚠️  PROBLEM: Hashes are the same even though content changed!")
    print(f"\nFull Structure 1:\n{structure1}\n")
    print(f"Full Structure 2:\n{structure2}")
else:
    print("\n✅ SUCCESS: Change was detected!")
