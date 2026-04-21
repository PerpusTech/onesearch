import json
import os
import sys
from collections import Counter

# Resolve project root (parent of scripts/)
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(PROJECT_ROOT)

data = json.load(open('output/biblio_20260407_125138.json', 'r', encoding='utf-8'))
print(f'Total records: {len(data)}')

has_ddc = [r for r in data if r.get('call_number_ddc')]
print(f'Records with DDC: {len(has_ddc)} ({len(has_ddc)*100//len(data)}%)')

has_subject = [r for r in data if r.get('subject')]
print(f'Records with subject: {len(has_subject)} ({len(has_subject)*100//len(data)}%)')

has_title = [r for r in data if r.get('title')]
print(f'Records with title: {len(has_title)} ({len(has_title)*100//len(data)}%)')

has_author = [r for r in data if r.get('author_main')]
print(f'Records with author: {len(has_author)} ({len(has_author)*100//len(data)}%)')

has_publisher = [r for r in data if r.get('publisher')]
print(f'Records with publisher: {len(has_publisher)} ({len(has_publisher)*100//len(data)}%)')

# Sample DDC values
ddcs = [r.get('call_number_ddc','') for r in has_ddc[:20]]
print(f'\nSample DDC: {ddcs}')

# DDC class distribution
ddc_classes = Counter()
ddc_names = {
    '0': 'Computer/Info',
    '1': 'Philosophy',
    '2': 'Religion',
    '3': 'Social Sciences',
    '4': 'Language',
    '5': 'Science',
    '6': 'Technology',
    '7': 'Arts',
    '8': 'Literature',
    '9': 'History/Geography'
}
for r in has_ddc:
    ddc = str(r.get('call_number_ddc', ''))
    if ddc and ddc[0].isdigit():
        ddc_classes[ddc[0]] += 1

print(f'\nDDC Main Class distribution:')
for k in sorted(ddc_classes.keys()):
    name = ddc_names.get(k, '?')
    count = ddc_classes[k]
    bar = '#' * (count // 100)
    print(f'  {k}00 {name:<20} {count:>5} {bar}')

# DDC division (2-digit)
print(f'\nTop 20 DDC Divisions:')
ddc_div = Counter()
for r in has_ddc:
    ddc = str(r.get('call_number_ddc', ''))
    if len(ddc) >= 3 and ddc[:3].replace('.','').isdigit():
        ddc_div[ddc[:3]] += 1
    elif len(ddc) >= 2 and ddc[:2].isdigit():
        ddc_div[ddc[:2] + '0'] += 1

for div, cnt in ddc_div.most_common(20):
    print(f'  {div}: {cnt}')

# item_type distribution
print(f'\nItem type distribution:')
types = Counter(r.get('item_type', 'N/A') for r in data)
for t, cnt in types.most_common():
    print(f'  {t}: {cnt}')

# Sample full record
print(f'\nSample record with DDC:')
sample = has_ddc[0]
for k, v in sample.items():
    if isinstance(v, list):
        v = ' | '.join(str(x) for x in v)
    print(f'  {k}: {v}')
