"""Property tests proving the geometry from first principles.

These tests are independent of the TypeScript engine: they assert the classical
theorems of angle relationships directly (vertical equal, linear pairs sum to
180, corresponding/alternate equal and co-interior supplementary WHEN parallel,
and that the non-parallel trap breaks the cross-line equalities).
"""

import os
import sys

from hypothesis import given
from hypothesis import strategies as st

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from geometry import (  # noqa: E402
    RELATIONSHIPS,
    angle_measures,
    relationship_holds,
    requires_parallel,
    solve,
    trap_skew,
)

# Inclinations kept in a sane teaching range. min/max chosen so neither the
# parallel nor the trapped bottom inclination collapses to a degenerate angle.
inclinations = st.floats(min_value=12, max_value=168)


@given(inclinations)
def test_vertical_angles_equal(a):
    m = angle_measures(a, parallel=True)
    for rel, i, j in (("vertical", 1, 4), ("vertical", 2, 3),
                      ("vertical", 5, 8), ("vertical", 6, 7)):
        assert relationship_holds(rel, i, j)
        assert m[i] == m[j]


@given(inclinations)
def test_linear_pairs_supplementary(a):
    m = angle_measures(a, parallel=True)
    for i, j in RELATIONSHIPS["linear-pair"]["pairs"]:
        assert abs(m[i] + m[j] - 180) < 1e-9


@given(inclinations, st.booleans())
def test_angles_are_positive(a, parallel):
    # The trap skew must never push an angle out of (0, 180).
    m = angle_measures(a, parallel)
    for v in m.values():
        assert 0 < v < 180


@given(inclinations)
def test_corresponding_and_alternate_equal_when_parallel(a):
    m = angle_measures(a, parallel=True)
    for rel in ("corresponding", "alternate-interior", "alternate-exterior"):
        for i, j in RELATIONSHIPS[rel]["pairs"]:
            assert m[i] == m[j], (rel, i, j)


@given(inclinations)
def test_co_interior_supplementary_when_parallel(a):
    m = angle_measures(a, parallel=True)
    for i, j in RELATIONSHIPS["co-interior"]["pairs"]:
        assert abs(m[i] + m[j] - 180) < 1e-9


@given(inclinations)
def test_non_parallel_trap_breaks_cross_line_equality(a):
    # With a non-zero skew the bottom inclination differs, so corresponding /
    # alternate pairs are NO LONGER equal — that's the trap.
    assert trap_skew(a) != 0
    m = angle_measures(a, parallel=False)
    for rel in ("corresponding", "alternate-interior", "alternate-exterior"):
        for i, j in RELATIONSHIPS[rel]["pairs"]:
            assert m[i] != m[j], (rel, i, j)


@given(inclinations)
def test_solve_returns_none_for_trap_require_parallel(a):
    for rel in RELATIONSHIPS:
        i, j = RELATIONSHIPS[rel]["pairs"][0]
        result = solve(a, parallel=False, relationship=rel,
                       given_angle=i, ask_angle=j)
        if requires_parallel(rel):
            assert result is None
        else:
            assert result is not None


@given(inclinations)
def test_solve_equal_and_supplementary_semantics(a):
    m = angle_measures(a, parallel=True)
    for rel in RELATIONSHIPS:
        kind = RELATIONSHIPS[rel]["kind"]
        for i, j in RELATIONSHIPS[rel]["pairs"]:
            given_val = m[i]
            result = solve(a, parallel=True, relationship=rel,
                           given_angle=i, ask_angle=j, given_value=given_val)
            assert result is not None
            if kind == "equal":
                assert abs(result - given_val) < 1e-6
            else:
                assert abs(result - (180 - given_val)) < 1e-6
            # And the result equals the figure's own measure of the asked angle.
            assert abs(result - m[j]) < 1e-6
