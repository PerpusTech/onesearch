"""
Ruleset DDC per Program Studi (Prodi) — dikonversi dari CnClassHelperr.php
Mendukung 3 pola rule:
  - str     : exact match atau prefix (mis. '657'  → cocok '657', '657.1', '657.xxx')
  - str + * : wildcard prefix         (mis. '005*' → cocok '005', '005.xxx')
  - [a, b]  : range inklusif          (mis. ['100','200'] → cocok DDC 100..200)

Alias: kode prodi pendek  →  key ruleset  (mis. 'HES' → 'FAI-HES')
"""

PRODI_RULES = {

    # ═══════════════════════════════════════ FAKULTAS AGAMA ISLAM ═══════════════════════════════════
    'FAI-HES': [
        '001.4', '001.42', '005*', '100*', '101*',
        '200.1', '297*',
        '330', '330.015195', '330.09', '330.1', '330.21',
        '332.1', '332.04', '332.3',
        '338.04', '338.6', '339*', '34*',
        '364.168', '492.7*',
        '519.5072', '523.7', '529.03', '529',
        '657', '658.5', '658.8',
    ],

    'FAI-HES-S2': [   # S2 Hukum Ekonomi Syariah
        '001.4', '001.42', '005*', '100*', '101*',
        '200.1', '297*',
        '330', '330.015195', '330.09', '330.1', '330.21',
        '332.1', '332.04', '332.3',
        '338.04', '338.6', '339*', '34*',
        '364.168', '492.7*',
        '519.5072', '523.7', '529.03', '529',
        '657', '658.5', '658.8',
    ],

    'FAI-IQT': [
        '001.4', '001.42', '005*', '100*', '101*',
        '200*', '220*', '221*', '222*', '223*',
        '297*', '297.12*', '297.13*', '297.14*', '297.15*',
        '297.16*', '297.17*', '297.18*', '297.19*',
        '492.7*', '519.5*',
    ],

    'FAI-PAI': [
        '001.4', '001.42', '005*', '100*', '200*', '297*', '370*',
        '371*', '372*', '373*', '374*', '375*', '376*', '377*', '378*', '379*',
        '492.7*', '519.5*',
    ],

    # ═══════════════════════════════════════ FAKULTAS EKONOMI BISNIS ═════════════════════════════════
    'FEB-MJM': [
        '001.4', '001.42', '005*', '150*', '158*',
        '301*', '302*', '303*', '306*',
        '330*', '331*', '332*', '336*', '338*', '339*',
        '340*', '346*',
        '519.5*',
        '658*', '659*',
    ],

    'FEB-AKT': [
        '001.4', '001.42', '005*',
        '330*', '332*', '336*', '338*', '339*',
        '340*', '346*',
        '519.5*',
        '657*', '658*',
    ],

    'FEB-EP': [
        '001.4', '001.42', '005*',
        '300*', '301*', '302*', '306*',
        '330*', '331*', '332*', '333*', '334*', '335*', '336*', '337*', '338*', '339*',
        '350*', '351*', '352*', '353*', '354*',
        '519.5*',
        '658*',
    ],

    'FEB-BDG': [  # Bisnis Digital
        '001.4', '001.42', '004*', '005*', '006*',
        '302.2*', '302.23*', '302.231*',
        '330*', '332*', '338*',
        '380*', '381*', '382*', '383*', '384*', '385*', '386*', '387*', '388*', '389*',
        '519.5*',
        '650*', '657*', '658*', '659*',
    ],

    # ═══════════════════════════════════════ FAKULTAS FARMASI ════════════════════════════════════════
    'FF-FAR': [
        '001.4', '001.42', '005*',
        '540*', '541*', '542*', '543*', '544*', '545*', '546*', '547*', '548*', '549*',
        '570*', '571*', '572*', '573*', '574*', '575*', '576*', '577*', '578*', '579*',
        '580*', '581*', '582*', '583*', '584*', '585*', '586*', '587*', '588*', '589*',
        '610*', '611*', '612*', '613*', '614*', '615*', '616*', '617*', '618*',
        '519.5*',
    ],

    # ═══════════════════════════════════════ FAKULTAS GEOGRAFI ═══════════════════════════════════════
    'FG-GEO': [
        '001.4', '001.42', '005*',
        '304*', '307*', '333*',
        '500*', '508*', '509*',
        '519.5*', '526*',
        '550*', '551*', '552*', '553*', '554*', '555*', '556*', '557*', '558*', '559*',
        '907*', '908*', '909*',
        '910*', '911*', '912*', '913*', '914*', '915*', '916*', '917*', '918*', '919*',
    ],

    'FG-SIG': [   # Sains Informasi Geografi
        '001.4', '001.42', '004*', '005*', '006*',
        '304*', '307*', '333*',
        '519.5*', '526*',
        '550*', '551*', '552*', '553*',
        '910*', '912*',
    ],

    # ═══════════════════════════════════════ FAKULTAS HUKUM ══════════════════════════════════════════
    'FHIP-HUKUM': [
        '001.4', '001.42', '005*',
        '340*', '341*', '342*', '343*', '344*', '345*', '346*', '347*', '348*', '349*',
        '350*', '351*', '352*', '353*', '354*',
        '363*', '364*',
        '519.5*',
    ],

    'FHIP-HI': [  # Hubungan Internasional
        '001.4', '001.42', '005*',
        '320*', '321*', '322*', '323*', '324*', '325*', '326*', '327*', '328*', '329*',
        '330*', '337*', '338*',
        '340*', '341*', '342*', '343*', '344*', '345*', '346*', '347*', '348*', '349*',
        '350*', '355*', '356*', '357*', '358*', '359*',
        '519.5*',
        '909*',
    ],

    'FHIP-ADM': [  # Administrasi Publik
        '001.4', '001.42', '005*',
        '302*', '303*', '306*',
        '320*', '321*', '322*', '323*', '324*', '325*',
        '330*', '336*', '338*',
        '340*', '341*', '342*', '343*', '344*', '346*', '348*', '349*',
        '350*', '351*', '352*', '353*', '354*',
        '519.5*',
        '658*', '659*',
    ],

    # ═══════════════════════════════════════ FAKULTAS ILMU KESEHATAN ══════════════════════════════════
    'FIK-FISIO': [
        '001.4', '001.42', '005*',
        '510*', '519.5*',
        '610*', '611*', '612*', '613*', '615*', '616*', '617*', '618*',
    ],

    'FIK-KEPER': [
        '001.4', '001.42', '005*',
        '155*', '158*',
        '510*', '519.5*',
        '610*', '611*', '612*', '613*', '614*', '615*', '616*', '617*', '618*',
    ],

    'FIK-GIZI': [
        '001.4', '001.42', '005*',
        '510*', '519.5*',
        '540*', '547*',
        '570*', '571*', '574*', '576*',
        '610*', '611*', '612*', '613*', '614*', '615*', '616*',
        '640*', '641*', '642*',
    ],

    'FIK-KESMAS': [
        '001.4', '001.42', '005*',
        '301*', '304*', '306*',
        '362*', '363*', '364*',
        '510*', '519.5*',
        '610*', '611*', '612*', '613*', '614*', '615*', '616*', '617*', '618*',
        '628*',
    ],

    # ═══════════════════════════════════════ FAKULTAS KEDOKTERAN ══════════════════════════════════════
    'FK-KED': [
        '001.4', '001.42', '005*',
        '150*', '154*', '155*', '157*', '158*',
        '510*', '519.5*',
        '570*', '571*', '572*', '573*', '574*', '575*', '576*', '577*',
        '610*', '611*', '612*', '613*', '614*', '615*', '616*', '617*', '618*',
    ],

    'FK-MARS': [  # Magister Administrasi RS
        '001.4', '001.42', '005*',
        '301*', '306*',
        '330*', '336*', '338*',
        '350*', '351*', '352*', '353*', '354*',
        '362*', '363*', '364*',
        '519.5*',
        '610*', '611*', '612*', '613*', '614*', '615*', '616*', '617*', '618*',
        '658*',
    ],

    # ═══════════════════════════════════════ FAKULTAS KEDOKTERAN GIGI ═════════════════════════════════
    'FKG-GIGI': [
        '001.4', '001.42', '005*',
        '519.5*',
        '570*', '571*', '572*', '574*', '576*', '577*',
        '610*', '611*', '612*', '613*', '614*', '615*', '616*', '617*', '618*',
    ],

    'FKG-PGIGI': [  # Profesi Dokter Gigi
        '001.4', '001.42',
        '519.5*',
        '610*', '611*', '612*', '613*', '615*', '616*', '617*',
    ],

    # ═══════════════════════════════════════ FAKULTAS KOMUNIKASI INFORMATIKA ═════════════════════════
    'FKI-ILKOM': [
        '001.4', '001.42', '005*',
        '150*', '158*',
        '300*', '301*', '302*', '303*', '306*',
        '380*', '384*',
        '519.5*',
        '650*', '659*',
        '700*', '741*', '770*', '778*',
        '800*', '808*',
    ],

    'FKI-INFOR': [
        '001.4', '001.42',
        '004*', '005*', '006*',
        '510*', '511*', '512*', '513*', '514*', '515*', '516*', '517*', '518*', '519*',
        '519.5*',
        '620*', '621*', '629*',
    ],

    'FKI-SI': [  # Sistem Informasi
        '001.4', '001.42',
        '004*', '005*', '006*',
        '330*', '338*',
        '510*', '519.5*',
        '620*', '621*', '629*',
        '658*',
    ],

    # ═══════════════════════════════════════ FKIP ════════════════════════════════════════════════════
    'FKIP-PAKT': [  # Pendidikan Akuntansi
        '001.4', '001.42', '005*',
        '330*', '332*', '336*', '338*', '339*',
        '340*', '346*',
        '370*', '371*', '372*', '373*', '374*', '375*', '376*', '377*', '378*', '379*',
        '510*', '519.5*',
        '657*', '658*',
    ],

    'FKIP-PPKN': [  # Pend. Pancasila & Kewarganegaraan
        '001.4', '001.42', '005*',
        '320*', '321*', '322*', '323*', '324*', '325*',
        '340*', '341*', '342*', '343*', '344*', '345*', '346*', '347*', '348*', '349*',
        '370*', '371*', '372*', '373*', '374*', '375*', '376*', '377*', '378*', '379*',
        '519.5*',
        '900*', '909*',
    ],

    'FKIP-PBSI': [  # Pend. Bahasa & Sastra Indonesia
        '001.4', '001.42', '005*',
        '370*', '371*', '372*', '375*',
        '400*', '410*', '411*', '412*', '413*', '414*', '415*', '418*',
        '419*', '499*',
        '519.5*',
        '800*', '810*', '820*', '830*', '840*', '850*', '860*', '870*', '880*', '890*',
        '899*',
    ],

    'FKIP-PBING': [  # Pendidikan Bahasa Inggris
        '001.4', '001.42', '005*',
        '370*', '371*', '372*', '375*',
        '400*', '410*', '420*', '421*', '422*', '423*', '424*', '425*', '427*', '428*',
        '519.5*',
        '820*', '821*', '822*', '823*', '824*', '825*', '826*', '827*', '828*',
    ],

    'FKIP-PMAT': [  # Pendidikan Matematika
        '001.4', '001.42', '005*',
        '370*', '371*', '372*', '375*',
        '510*', '511*', '512*', '513*', '514*', '515*', '516*', '517*', '518*', '519*',
        '519.5*',
    ],

    'FKIP-PBIO': [  # Pendidikan Biologi
        '001.4', '001.42', '005*',
        '370*', '371*', '372*', '375*',
        '510*', '519.5*',
        '570*', '571*', '572*', '573*', '574*', '575*', '576*', '577*', '578*', '579*',
        '580*', '581*', '582*', '583*', '584*', '585*', '586*', '587*', '588*', '589*',
        '590*', '591*', '592*', '593*', '594*', '595*', '596*', '597*', '598*', '599*',
        '636*',
    ],

    'FKIP-PFIS': [  # Pendidikan Fisika
        '001.4', '001.42', '005*',
        '370*', '371*', '372*', '375*',
        '510*', '519.5*',
        '530*', '531*', '532*', '533*', '534*', '535*', '536*', '537*', '538*', '539*',
        '620*', '621*',
    ],

    'FKIP-PGSD': [  # Pend. Guru Sekolah Dasar
        '001.4', '001.42', '005*',
        '370*', '371*', '372*', '373*', '374*', '375*', '376*', '377*', '378*', '379*',
        '400*', '420*', '499*',
        '510*', '519.5*',
        '800*', '899*',
    ],

    'FKIP-PAUD': [  # Pend. Anak Usia Dini
        '001.4', '001.42', '005*',
        '150*', '155*',
        '370*', '371*', '372*', '373*', '374*', '375*', '376*', '377*', '378*', '379*',
        '519.5*',
        '649*',
    ],

    'FKIP-BK': [  # Bimbingan Konseling
        '001.4', '001.42', '005*',
        '150*', '152*', '153*', '154*', '155*', '156*', '157*', '158*',
        '370*', '371*', '372*', '375*',
        '519.5*',
    ],

}


# ─── Metadata label lengkap per prodi ────────────────────────────────────────
PRODI_META = {
    # FAI
    'FAI-HES':     {'label': 'Hukum Ekonomi Syariah (S1)',       'fakultas': 'FAI', 'fakultas_label': 'Fak. Agama Islam'},
    'FAI-HES-S2':  {'label': 'Hukum Ekonomi Syariah (S2)',       'fakultas': 'FAI', 'fakultas_label': 'Fak. Agama Islam'},
    'FAI-IQT':     {'label': 'Ilmu Al-Quran & Tafsir',           'fakultas': 'FAI', 'fakultas_label': 'Fak. Agama Islam'},
    'FAI-PAI':     {'label': 'Pendidikan Agama Islam',           'fakultas': 'FAI', 'fakultas_label': 'Fak. Agama Islam'},
    # FEB
    'FEB-MJM':     {'label': 'Manajemen',                        'fakultas': 'FEB', 'fakultas_label': 'Fak. Ekonomi Bisnis'},
    'FEB-AKT':     {'label': 'Akuntansi',                        'fakultas': 'FEB', 'fakultas_label': 'Fak. Ekonomi Bisnis'},
    'FEB-EP':      {'label': 'Ekonomi Pembangunan',              'fakultas': 'FEB', 'fakultas_label': 'Fak. Ekonomi Bisnis'},
    'FEB-BDG':     {'label': 'Bisnis Digital',                   'fakultas': 'FEB', 'fakultas_label': 'Fak. Ekonomi Bisnis'},
    # FF
    'FF-FAR':      {'label': 'Farmasi',                          'fakultas': 'FF',  'fakultas_label': 'Fak. Farmasi'},
    # FG
    'FG-GEO':      {'label': 'Geografi',                         'fakultas': 'FG',  'fakultas_label': 'Fak. Geografi'},
    'FG-SIG':      {'label': 'Sains Informasi Geografi',         'fakultas': 'FG',  'fakultas_label': 'Fak. Geografi'},
    # FHIP
    'FHIP-HUKUM':  {'label': 'Hukum',                            'fakultas': 'FHIP','fakultas_label': 'Fak. Hukum & Ilmu Politik'},
    'FHIP-HI':     {'label': 'Hubungan Internasional',           'fakultas': 'FHIP','fakultas_label': 'Fak. Hukum & Ilmu Politik'},
    'FHIP-ADM':    {'label': 'Administrasi Publik',              'fakultas': 'FHIP','fakultas_label': 'Fak. Hukum & Ilmu Politik'},
    # FIK
    'FIK-FISIO':   {'label': 'Fisioterapi',                      'fakultas': 'FIK', 'fakultas_label': 'Fak. Ilmu Kesehatan'},
    'FIK-KEPER':   {'label': 'Keperawatan',                      'fakultas': 'FIK', 'fakultas_label': 'Fak. Ilmu Kesehatan'},
    'FIK-GIZI':    {'label': 'Ilmu Gizi',                        'fakultas': 'FIK', 'fakultas_label': 'Fak. Ilmu Kesehatan'},
    'FIK-KESMAS':  {'label': 'Kesehatan Masyarakat',             'fakultas': 'FIK', 'fakultas_label': 'Fak. Ilmu Kesehatan'},
    # FK
    'FK-KED':      {'label': 'Kedokteran',                       'fakultas': 'FK',  'fakultas_label': 'Fak. Kedokteran'},
    'FK-MARS':     {'label': 'Magister Administrasi RS',         'fakultas': 'FK',  'fakultas_label': 'Fak. Kedokteran'},
    # FKG
    'FKG-GIGI':    {'label': 'Pendidikan Dokter Gigi',           'fakultas': 'FKG', 'fakultas_label': 'Fak. Kedokteran Gigi'},
    'FKG-PGIGI':   {'label': 'Profesi Dokter Gigi',              'fakultas': 'FKG', 'fakultas_label': 'Fak. Kedokteran Gigi'},
    # FKI
    'FKI-ILKOM':   {'label': 'Ilmu Komunikasi',                  'fakultas': 'FKI', 'fakultas_label': 'Fak. Komunikasi & Informatika'},
    'FKI-INFOR':   {'label': 'Teknik Informatika',               'fakultas': 'FKI', 'fakultas_label': 'Fak. Komunikasi & Informatika'},
    'FKI-SI':      {'label': 'Sistem Informasi',                 'fakultas': 'FKI', 'fakultas_label': 'Fak. Komunikasi & Informatika'},
    # FKIP
    'FKIP-PAKT':   {'label': 'Pendidikan Akuntansi',             'fakultas': 'FKIP','fakultas_label': 'Fak. Keguruan & Ilmu Pendidikan'},
    'FKIP-PPKN':   {'label': 'Pend. Pancasila & Kewarganegaraan','fakultas': 'FKIP','fakultas_label': 'Fak. Keguruan & Ilmu Pendidikan'},
    'FKIP-PBSI':   {'label': 'Pend. Bahasa & Sastra Indonesia',  'fakultas': 'FKIP','fakultas_label': 'Fak. Keguruan & Ilmu Pendidikan'},
    'FKIP-PBING':  {'label': 'Pendidikan Bahasa Inggris',        'fakultas': 'FKIP','fakultas_label': 'Fak. Keguruan & Ilmu Pendidikan'},
    'FKIP-PMAT':   {'label': 'Pendidikan Matematika',            'fakultas': 'FKIP','fakultas_label': 'Fak. Keguruan & Ilmu Pendidikan'},
    'FKIP-PBIO':   {'label': 'Pendidikan Biologi',               'fakultas': 'FKIP','fakultas_label': 'Fak. Keguruan & Ilmu Pendidikan'},
    'FKIP-PFIS':   {'label': 'Pendidikan Fisika',                'fakultas': 'FKIP','fakultas_label': 'Fak. Keguruan & Ilmu Pendidikan'},
    'FKIP-PGSD':   {'label': 'Pend. Guru Sekolah Dasar',         'fakultas': 'FKIP','fakultas_label': 'Fak. Keguruan & Ilmu Pendidikan'},
    'FKIP-PAUD':   {'label': 'Pend. Anak Usia Dini',             'fakultas': 'FKIP','fakultas_label': 'Fak. Keguruan & Ilmu Pendidikan'},
    'FKIP-BK':     {'label': 'Bimbingan & Konseling',            'fakultas': 'FKIP','fakultas_label': 'Fak. Keguruan & Ilmu Pendidikan'},
}


# ─── Alias: kode singkat → key ruleset ───────────────────────────────────────
PRODI_ALIAS = {
    'HES':    'FAI-HES',
    'IQT':    'FAI-IQT',
    'PAI':    'FAI-PAI',
    'MJM':    'FEB-MJM',
    'AKT':    'FEB-AKT',
    'EP':     'FEB-EP',
    'BDG':    'FEB-BDG',
    'FAR':    'FF-FAR',
    'GEO':    'FG-GEO',
    'SIG':    'FG-SIG',
    'HUKUM':  'FHIP-HUKUM',
    'HI':     'FHIP-HI',
    'ADM':    'FHIP-ADM',
    'FISIO':  'FIK-FISIO',
    'KEPER':  'FIK-KEPER',
    'GIZI':   'FIK-GIZI',
    'KESMAS': 'FIK-KESMAS',
    'KED':    'FK-KED',
    'MARS':   'FK-MARS',
    'GIGI':   'FKG-GIGI',
    'PGIGI':  'FKG-PGIGI',
    'ILKOM':  'FKI-ILKOM',
    'INFOR':  'FKI-INFOR',
    'SI':     'FKI-SI',
    'PAKT':   'FKIP-PAKT',
    'PPKN':   'FKIP-PPKN',
    'PBSI':   'FKIP-PBSI',
    'PBING':  'FKIP-PBING',
    'PMAT':   'FKIP-PMAT',
    'PBIO':   'FKIP-PBIO',
    'PFIS':   'FKIP-PFIS',
    'PGSD':   'FKIP-PGSD',
    'PAUD':   'FKIP-PAUD',
    'BK':     'FKIP-BK',
}


# ─── Helper: match satu DDC terhadap satu rule ───────────────────────────────
def _ddc_matches_rule(ddc: str, rule) -> bool:
    """Cek apakah ddc cocok dengan satu rule.
    
    Rule bisa berupa:
      - str tanpa '*' : prefix match (ddc harus ber-awalan rule atau sama persis)
      - str + '*'     : wildcard prefix (sama dengan di atas, strip '*' dulu)
      - list [a, b]   : range inklusif via versi-compare sederhana
    """
    if not ddc:
        return False

    if isinstance(rule, list) and len(rule) == 2:
        # Range: '100' <= ddc <= '200'  (string compare cukup karena sudah zero-padded)
        lo, hi = str(rule[0]).rstrip('*'), str(rule[1]).rstrip('*')
        return lo <= ddc <= hi or ddc.startswith(lo) or ddc.startswith(hi)

    rule_str = str(rule).rstrip('*')
    # Prefix match: '657' cocok dengan '657', '657.1', '657.123', dll.
    return ddc == rule_str or ddc.startswith(rule_str + '.') or ddc.startswith(rule_str)


def match_prodi(ddc: str, rules: list) -> bool:
    """Cek apakah ddc cocok dengan salah satu rule dalam list rules."""
    for rule in rules:
        if _ddc_matches_rule(ddc, rule):
            return True
    return False


def get_prodi_for_ddc(ddc: str) -> list:
    """Kembalikan list kode prodi yang relevan untuk DDC tertentu."""
    if not ddc:
        return []
    result = []
    for kode, rules in PRODI_RULES.items():
        if match_prodi(ddc, rules):
            result.append(kode)
    return result
