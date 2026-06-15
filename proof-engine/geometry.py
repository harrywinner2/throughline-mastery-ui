"""Independent Python re-implementation of the Throughline geometry engine.

This mirrors the canonical TypeScript engine at
``web/src/engine/geometry.ts`` exactly. Its sole purpose is to PROVE — in a
second language, outside of any LLM — that the product's correctness logic is
right. The two engines are property-tested and cross-checked to agree.

Geometry model: two lines cut by a transversal. Eight angles, labelled 1..8.

        1 \\ 2            (top intersection, line m)
        3 \\ 4
           \\
        5 \\ 6            (bottom intersection, line n)
        7 \\ 8

With the transversal at acute inclination ``a`` to the lines, the measures are
    top:    {1:180-a, 2:a, 3:a, 4:180-a}
    bottom: {5:180-b, 6:b, 7:b, 8:180-b}   (b == a when m parallel n)

When the lines are NOT parallel we model the trap with a deliberately
different bottom inclination ``b = a + trap_skew(a)`` so the cross-intersection
relationships break.
"""

from __future__ import annotations

from typing import Dict, List, Optional, Tuple

# Relationship kinds.
EQUAL = "equal"
SUPPLEMENTARY = "supplementary"

# The classical angle-pair table. Each relationship lists its angle pairs and
# whether the connected angles are EQUAL or SUPPLEMENTARY. Mirrors the TS
# RELATIONSHIP_PAIRS exactly.
RELATIONSHIPS: Dict[str, Dict[str, object]] = {
    "corresponding": {
        "pairs": [(1, 5), (2, 6), (3, 7), (4, 8)],
        "kind": EQUAL,
    },
    "alternate-interior": {
        "pairs": [(3, 6), (4, 5)],
        "kind": EQUAL,
    },
    "alternate-exterior": {
        "pairs": [(1, 8), (2, 7)],
        "kind": EQUAL,
    },
    "co-interior": {
        "pairs": [(3, 5), (4, 6)],
        "kind": SUPPLEMENTARY,
    },
    "vertical": {
        "pairs": [(1, 4), (2, 3), (5, 8), (6, 7)],
        "kind": EQUAL,
    },
    "linear-pair": {
        "pairs": [
            (1, 2), (3, 4), (1, 3), (2, 4),
            (5, 6), (7, 8), (5, 7), (6, 8),
        ],
        "kind": SUPPLEMENTARY,
    },
}

TOL = 1e-6


def _round(n: float) -> float:
    """Match the TS ``round`` helper: round to 1e-6 precision."""
    # TS: Math.round(n * 1e6) / 1e6
    return round(n * 1e6) / 1e6


def trap_skew(a: float) -> float:
    """A fixed, deterministic skew that makes trap lines visibly non-parallel.

    Mirrors the TS ``trapSkew``: +22 when a <= 90, else -22.
    """
    return 22 if a <= 90 else -22


def angle_measures(inclination: float, parallel: bool) -> Dict[int, float]:
    """Exact measure of each of the 8 angles for a given figure."""
    a = inclination
    top = {1: 180 - a, 2: a, 3: a, 4: 180 - a}
    b = a if parallel else a + trap_skew(a)
    bottom = {5: 180 - b, 6: b, 7: b, 8: 180 - b}
    return {**top, **bottom}


def relationship_holds(rel: str, i: int, j: int) -> bool:
    """Does ``rel`` actually connect angles i and j in this figure?"""
    pairs: List[Tuple[int, int]] = RELATIONSHIPS[rel]["pairs"]  # type: ignore[assignment]
    return any((p == i and q == j) or (p == j and q == i) for p, q in pairs)


def requires_parallel(rel: str) -> bool:
    """Is a pair a cross-intersection relationship that REQUIRES parallel lines?"""
    return rel in (
        "corresponding",
        "alternate-interior",
        "alternate-exterior",
        "co-interior",
    )


def solve(
    inclination: float,
    parallel: bool,
    relationship: str,
    given_angle: int,
    ask_angle: int,
    given_value: Optional[float] = None,
) -> Optional[float]:
    """The ground-truth measure of the asked angle, derived from the given angle.

    Returns ``None`` when the connecting rule does not apply (non-parallel
    trap with a require-parallel relationship), which is itself a teachable
    correct answer ("cannot be determined this way").

    Matches the TS ``solve`` for the single-rule (non-chaining) case.
    """
    measures = angle_measures(inclination, parallel)

    # Trap: a cross-intersection rule that needs parallel lines, but lines aren't.
    if not parallel and requires_parallel(relationship):
        return None

    # If given_value was not supplied, read it from the figure's measures.
    if given_value is None:
        given_value = measures[given_angle]

    # Standard single-rule case.
    if relationship_holds(relationship, given_angle, ask_angle):
        kind = RELATIONSHIPS[relationship]["kind"]
        return _round(given_value) if kind == EQUAL else _round(180 - given_value)

    # Fallback: compute directly from the figure (always exact).
    return _round(measures[ask_angle])
