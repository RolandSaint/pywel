#!/usr/bin/env python3
"""One-shot reproduction of a reviewed S03 proposal, never a collector or runtime tool.

Inputs: exact base checkout and explicit reviewed seed/templates. Output is accepted
only when all 12 pre-recorded file digests match. No network is used here.
"""
import copy
import hashlib
import json
import re
import shutil
import sys
from pathlib import Path

root = Path(sys.argv[1]).resolve()
assets = Path(sys.argv[2]).resolve()
seed = json.loads((assets / 'seed.json').read_text())
expected = json.loads((assets / 'expected.json').read_text())

def read(path):
    return json.loads((root / path).read_text())

def digest(data):
    return hashlib.sha256(data).hexdigest()

def write(path, value, sort=True):
    target = root / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(value, ensure_ascii=False, sort_keys=sort, indent=2) + '\n')

def records(family):
    result = []
    for path in sorted((root / 'data/canonical' / family).glob('*.json')):
        value = json.loads(path.read_text())
        result.extend(value.get('records', [value]))
    return result

def replace_once(path, old, new):
    target = root / path
    text = target.read_text()
    assert text.count(old) == 1, 'Unexpected base text: ' + path
    target.write_text(text.replace(old, new))

prior_files = {str(p.relative_to(root)): digest(p.read_bytes()) for p in sorted((root/'data/canonical').rglob('*.json'))}
assert len(prior_files) == 68
prior_entities = records('entities')
prior_claims = records('claims')
prior_receipts = records('receipts')
assert (len(prior_entities), len(prior_claims), len(prior_receipts)) == (520, 2591, 7)
by_claim = {c['claim_id']: c for c in prior_claims}
for path, sha in seed['ledger_constant']['source_input_file_sha256'].items():
    assert digest((root/path).read_bytes()) == sha
inputs = sorted([c for path in seed['ledger_constant']['source_input_file_sha256'] for c in read(path)['records'] if c['predicate']=='recipe.input'], key=lambda c:c['claim_id'])
assert len(inputs) == 161

entities = []
for label, entity_id, kind in seed['entities']:
    entity = copy.deepcopy(seed['entity_template'])
    entity.update(entity_id=entity_id, canonical_name={'locale':'en-US','text':label}, entity_type=kind,
                  subtype='consumable' if kind=='item' else 'material', slug=kind+'.'+label.lower().replace(' ','-'))
    entity['summary'] = (f'Prepared-food reference named {label} in retained recipe inputs and output. Distinct from the same-named recipe; no new effect, unlock or live-availability assertion.' if kind=='item' else f'Named ingredient reference from retained historical recipe inputs: {label}. Specific inventory implementation, acquisition and current-patch behavior are not established here.')
    entities.append(entity)
entities.sort(key=lambda e:e['entity_id'])
new_by_label = {e['canonical_name']['text']:e for e in entities}

claims = []
def make_claim(source_id, claim_id, target, predicate, supersedes=()):
    parent = by_claim[source_id]
    result = {k:copy.deepcopy(parent[k]) for k in ['behavior_kind','confidence','evidence_ids','spoiler_level','status','subject_entity_id','validity']}
    result['confidence'] = min(parent['confidence'], 0.24) if predicate=='relation.crafted_from' else parent['confidence']
    result.update(claim_id=claim_id, predicate=predicate, object={'entity_id':target,'kind':'entity'},
                  schema_version='pywel.claim.v1', provenance=copy.deepcopy(seed['entity_template']['provenance']))
    if supersedes:
        result['supersedes_claim_ids'] = list(supersedes)
    claims.append(result)
    return result

new_edges = {}
for source_id, claim_id, target, supersedes in seed['input_edges']:
    new_edges[source_id] = make_claim(source_id, claim_id, target, 'relation.crafted_from', supersedes)
for mapping in seed['ledger_constant']['food_output_mapping']:
    make_claim(mapping['source_output_claim_id'], mapping['new_output_claim_id'], mapping['item_entity_id'], 'recipe.output')
claims.sort(key=lambda c:c['claim_id'])
assert len(claims)==36 and len(entities)==25

label_groups = {}
for parent in inputs:
    match = re.fullmatch(r'(.+?)(?:\s*×([1-9][0-9]*))?', parent['object']['value'])
    assert match
    label_groups.setdefault(match[1], []).append(parent['claim_id'])
label_mapping = []
for label, source_ids in sorted(label_groups.items()):
    matching = sorted(e['entity_id'] for e in prior_entities if label.casefold() in [e['canonical_name']['text'].casefold()]+[a['text'].casefold() for a in e['aliases']])
    if label in seed['held_reasons']:
        disposition, target, reason = 'held_category_identity', None, seed['held_reasons'][label]
    elif label in new_by_label:
        new = new_by_label[label]
        target = new['entity_id']
        if new['entity_type']=='item':
            disposition='new_food_distinct_from_recipe'
            reason='Retained input and exact recipe.output identify food, not the recipe process. Preserve the existing recipe ID; create a distinct item ID.'
        else:
            disposition='new_named_material'
            reason='Input label supports a bounded ingredient reference, not a source re-collection or gameplay observation.'
    else:
        eligible = [e for e in prior_entities if e['entity_id'] in matching and e['entity_type']=='resource']
        assert len(eligible)==1, 'Ambiguous existing target: '+label
        disposition, target, reason='reuse_existing_resource',eligible[0]['entity_id'],'Exact compatible-type name/alias match; reuse stable identity.'
    label_mapping.append({'source_label':label,'matching_existing_entity_ids':matching,'occurrences':len(source_ids),
                          'supporting_input_claim_ids':sorted(source_ids),'disposition':disposition,'target_entity_id':target,'reason':reason})
labels = {m['source_label']:m for m in label_mapping}
input_mapping = []
for parent in inputs:
    text = parent['object']['value']
    match = re.fullmatch(r'(.+?)(?:\s*×([1-9][0-9]*))?', text)
    label = match[1]
    target = labels[label]['target_entity_id']
    mapping = {'source_input_claim_id':parent['claim_id'],'recipe_entity_id':parent['subject_entity_id'],
               'source_text':text,'source_label':label,'quantity':int(match[2]) if match[2] else None,
               'quantity_status':'explicit_source_count' if match[2] else 'not_recorded',
               'evidence_ids':parent['evidence_ids'],'target_entity_id':target}
    if target is None:
        mapping.update(disposition='held_category_identity',relation_claim_id=None)
    elif parent['claim_id'] in new_edges:
        edge=new_edges[parent['claim_id']]
        supersedes=edge.get('supersedes_claim_ids',[])
        mapping.update(disposition='replaces_recipe_target' if supersedes else 'new_identity_link', relation_claim_id=edge['claim_id'])
        if supersedes: mapping['supersedes_claim_ids']=supersedes
    else:
        matches=[c for c in prior_claims if c['predicate']=='relation.crafted_from' and c['subject_entity_id']==parent['subject_entity_id'] and c['object']=={'kind':'entity','entity_id':target} and c['status']!='retracted']
        assert len(matches)==1
        mapping.update(disposition='existing_link_unchanged',relation_claim_id=matches[0]['claim_id'])
    input_mapping.append(mapping)

ledger=copy.deepcopy(seed['ledger_constant'])
ledger.update(input_mapping=input_mapping,label_mapping=label_mapping,prior_canonical_files=prior_files,
              recipe_subject_ids=sorted({c['subject_entity_id'] for c in inputs}),
              recipes_gaining_input_links=sorted({c['subject_entity_id'] for c in new_edges.values()}),
              frozen_prior_receipt_ids=sorted(r['receipt_id'] for r in prior_receipts))
write('data/canonical/entities/s03-recipe-inputs.json',{'catalog_id':seed['entity_catalog_id'],'records':entities,'schema_version':'pywel.entity_catalog.v1'})
write('data/canonical/claims/s03-recipe-inputs.json',{'catalog_id':seed['claim_catalog_id'],'records':claims,'schema_version':'pywel.claim_catalog.v1'})
receipt=copy.deepcopy(seed['receipt'])
receipt['related_record_ids']=sorted([e['entity_id'] for e in entities]+[c['claim_id'] for c in claims])
write('data/canonical/receipts/s03-recipe-inputs.json',receipt)
write('quality/s03-recipe-input-review.json',ledger)

manifest=read('quality/corpus-additions.json')
for family in ['claims','entities','receipts']:
    path='data/canonical/'+family+'/s03-recipe-inputs.json'
    assert not any(f['path']==path for f in manifest['canonical_files'])
    manifest['canonical_files'].append({'path':path,'sha256':digest((root/path).read_bytes())})
manifest['canonical_files'].sort(key=lambda f:f['path'])
for family, key, rows in [('claims','claim_id',claims),('entities','entity_id',entities),('receipts','receipt_id',[receipt])]:
    manifest['record_ids'][family]=sorted(manifest['record_ids'][family]+[r[key] for r in rows])
manifest['scope_id']='pywel-post-release-m7-s03'
write('quality/corpus-additions.json',manifest,False)
replace_once('000_LOAD_FIRST_PYWEL.yaml','  - docs/S02_ACQUISITION.md\n','  - docs/S02_ACQUISITION.md\n  - docs/S03_RECIPE_INPUTS.md\n')
publication=read('quality/publication-contract-v1.json')
for key,value in publication.items():
    if isinstance(value,list) and 'S02_ACQUISITION.md' in value:
        assert 'S03_RECIPE_INPUTS.md' not in value
        value.append('S03_RECIPE_INPUTS.md')
write('quality/publication-contract-v1.json',publication,False)
# Only exact small text deltas, never wholesale substitution of earlier source.
text_edits=json.loads((assets/'text-edits.json').read_text())
for path,changes in text_edits.items():
    for old,new in changes: replace_once(path,old,new)
for name in ['docs/S03_RECIPE_INPUTS.md','tests/s03-recipe-inputs.test.ts']:
    target=root/name
    assert not target.exists()
    target.parent.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(assets/Path(name).name,target)

for path,sha in prior_files.items():
    assert digest((root/path).read_bytes())==sha,'Earlier canonical file changed: '+path
for f in expected['files']:
    actual=digest((root/f['path']).read_bytes())
    assert actual==f['sha256'], f'Output mismatch {f["path"]}: {actual}'
print(json.dumps({'result':'pass','verified_output_files':len(expected['files']),'prior_canonical_files_preserved':len(prior_files),'new_entities':len(entities),'new_claims':len(claims),'expected_tree':expected['expected_tree']}))
