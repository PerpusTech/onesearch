const fs = require('fs');
let py = fs.readFileSync('proxy/app.py', 'utf8');

const helperCode = `def _parse_crossref_items(items_raw, source_name="Crossref", id_prefix="cr"):
    """Parse raw items from Crossref API response into normalized publication dicts."""
    items = []
    type_map = {
        'journal-article': 'Journal Article',
        'book-chapter': 'Book Chapter',
        'book': 'eBook',
        'proceedings-article': 'Conference Proceeding',
        'dataset': 'Dataset',
        'monograph': 'Monograph'
    }
    for it in items_raw:
        authors_list = []
        for a in it.get('author', []):
            name_parts = [a.get('family', ''), a.get('given', '')]
            name = ", ".join([p for p in name_parts if p]) or a.get('name', '')
            if name:
                authors_list.append(name)
        authors_str = "; ".join(authors_list) if authors_list else "Unknown"

        titles = it.get('title', [])
        title_str = clean_title(titles[0] if titles else "Untitled")

        pub_date = it.get('published', {}).get('date-parts', [[]])[0]
        year = pub_date[0] if len(pub_date) > 0 else 0
        date_str = "-".join([str(p).zfill(2) for p in pub_date]) if pub_date else str(year or "")

        container = it.get('container-title', [])
        pub_name = container[0] if container else it.get('publisher', source_name)

        doi = clean_doi(it.get('DOI', ''))
        doi_url = f"https://doi.org/{doi}" if doi else ""
        if source_name == "Springer" and doi:
            item_url = f"https://link.springer.com/doi/{doi}"
        elif source_name == "Emerald" and doi:
            item_url = f"https://www.emerald.com/insight/content/doi/{doi}"
        else:
            item_url = doi_url or (it.get('URL') or '')

        abstract_clean = clean_html_tags(it.get('abstract', ''))
        raw_type = it.get('type', 'article')
        content_type = type_map.get(raw_type, raw_type.replace('-', ' ').title())
        is_oa = bool(it.get('license')) or any('open' in str(l).lower() for l in it.get('link', []))

        items.append({
            "id": f"{id_prefix}-{doi or it.get('URL', '')}",
            "title": title_str,
            "authors": authors_str,
            "contentType": content_type,
            "publicationName": pub_name,
            "publicationType": source_name if source_name != "Springer" else "Springer Nature",
            "date": date_str,
            "year": year,
            "doi": doi,
            "url": item_url,
            "pdfUrl": next((l.get('URL', '') for l in it.get('link', []) if 'pdf' in str(l.get('content-type', '')).lower() or str(l.get('URL', '')).endswith('.pdf')), '') if is_oa else '',
            "abstract": abstract_clean,
            "openAccess": is_oa,
            "source": source_name
        })
    return items


`;

// 1. Insert helper before "# ── SINGLE SOURCE FETCHER WITH CIRCUIT BREAKERS & RETRY ──"
const markerFetcher = '# ── SINGLE SOURCE FETCHER WITH CIRCUIT BREAKERS & RETRY ──';
if (py.includes(markerFetcher)) {
    py = py.replace(markerFetcher, helperCode + markerFetcher);
    console.log('1. Helper inserted');
} else {
    console.log('Marker fetcher not found');
}

// 2. Replace Springer loop
const spLoopRegex = /for it in items_raw:\r?\n\s+authors_list = \[\][\s\S]+?"source": "Springer"\r?\n\s+\}\)/;
if (spLoopRegex.test(py)) {
    py = py.replace(spLoopRegex, 'items = _parse_crossref_items(items_raw, source_name="Springer", id_prefix="sp")');
    console.log('2. Springer loop replaced');
} else {
    console.log('Springer loop not found');
}

// 3. Replace Emerald loop
const emLoopRegex = /for it in items_raw:\r?\n\s+authors_list = \[\][\s\S]+?"source": "Emerald"\r?\n\s+\}\)/;
if (emLoopRegex.test(py)) {
    py = py.replace(emLoopRegex, 'items = _parse_crossref_items(items_raw, source_name="Emerald", id_prefix="em")');
    console.log('3. Emerald loop replaced');
} else {
    console.log('Emerald loop not found');
}

// 4. Replace Crossref loop
const crLoopRegex = /for it in items_raw:\r?\n\s+authors_list = \[\][\s\S]+?"source": "Crossref"\r?\n\s+\}\)/;
if (crLoopRegex.test(py)) {
    py = py.replace(crLoopRegex, 'items = _parse_crossref_items(items_raw, source_name="Crossref", id_prefix="cr")');
    console.log('4. Crossref loop replaced');
} else {
    console.log('Crossref loop not found');
}

fs.writeFileSync('proxy/app.py', py, 'utf8');
console.log('proxy/app.py updated successfully!');

