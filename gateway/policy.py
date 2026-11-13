"""Fail-closed validation of the pinned trial policy; no deployment defaults."""
import json
from decimal import Decimal, InvalidOperation
from pathlib import Path


def unique_object(pairs):
    result = {}
    for k, v in pairs:
        if k in result:
            raise ValueError()
        result[k] = v
    return result


def load_policy(path):
    try:
        p = json.loads(Path(path).read_text(), object_pairs_hook=unique_object, parse_constant=lambda _: (_ for _ in ()).throw(ValueError()))
        expected = {'id': 'mainland-A-r02', 'provider': 'tencent-general-accurate',
                    'region': 'ap-guangzhou', 'currency': 'CNY'}
        keys = set(expected) | {'maxCalls', 'maxBudget', 'minReservedUnitCost',
                                'maxConcurrent', 'maxPerMinute', 'onlineImageBytes'}
        if type(p) is not dict or set(p) != keys:
            raise ValueError()
        if any(type(p[k]) is not str or p[k] != v for k, v in expected.items()):
            raise ValueError()
        for k, upper in [('maxCalls', 100), ('maxConcurrent', 1),
                         ('maxPerMinute', 6), ('onlineImageBytes', 7 * 1024 * 1024)]:
            if type(p[k]) is not int or not 1 <= p[k] <= upper:
                raise ValueError()
        for k in ['maxBudget', 'minReservedUnitCost']:
            if type(p[k]) is not str or len(p[k]) > 40:
                raise ValueError()
            value = Decimal(p[k])
            if not value.is_finite() or value <= 0:
                raise ValueError()
        if Decimal(p['maxBudget']) > 50 or not Decimal('0.50') <= Decimal(p['minReservedUnitCost']) <= Decimal(p['maxBudget']):
            raise ValueError()
        if Decimal(p['minReservedUnitCost']) * p['maxCalls'] > Decimal(p['maxBudget']):
            raise ValueError()
        return p
    except (OSError, ValueError, TypeError, InvalidOperation, KeyError):
        raise ValueError('TRIAL_POLICY_INVALID') from None
