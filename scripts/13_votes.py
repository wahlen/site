# -*- coding: utf-8 -*-
import pandas as pd

df = pd.read_csv(
    '../data/kerg_2013_pre.csv', skiprows=5, header=None, encoding='iso-8859-1', sep=';')

# limit rows to state results, area code 99 is Bundesgebiet
col_area = df[2]
df_states = df[col_area == 99]

col_map = {
    1: 'Bundesland',                # B
    3: 'Wahlberechtigte',           # D
    7: 'Wähler',                    # H
    15: 'Gültige Erststimmen',      # P
    17: 'Gültige Zweitstimmen',     # R
    19: 'CDU Erststimmen',
    21: 'CDU Zweitstimmen',
    23: 'SPD Erststimmen',
    25: 'SPD Zweitstimmen',
    27: 'FDP Erststimmen',
    29: 'FDP Zweitstimmen',
    31: 'LINKE Erststimmen',
    33: 'LINKE Zweitstimmen',
    35: 'GRÜNE Erststimmen',
    37: 'GRÜNE Zweitstimmen',
    39: 'CSU Erststimmen',
    41: 'CSU Zweitstimmen',
    43: 'PIRATEN Erststimmen',
    45: 'PIRATEN Zweitstimmen',
    47: 'NPD Erststimmen',
    49: 'NPD Zweitstimmen',
    103: 'AfD Erststimmen',
    105: 'AfD Zweitstimmen',

}

# vote cols
vote_cols = sorted(col_map.keys())
df_votes = df_states[vote_cols]

# change column headings to meaningful strings
df_votes.columns = df_votes.columns.map(lambda x: col_map[x])

# union CDU and CSU treat NaN as 0
df_votes['Union Erststimmen'] = df_votes['CSU Erststimmen'].add(df_votes['CDU Erststimmen'], fill_value=0)
df_votes['Union Zweitstimmen'] = df_votes['CSU Zweitstimmen'].add(df_votes['CDU Zweitstimmen'], fill_value=0)

del df_votes['CDU Erststimmen']
del df_votes['CSU Erststimmen']
del df_votes['CDU Zweitstimmen']
del df_votes['CSU Zweitstimmen']

# save as CSV without the 1st index col
df_votes.to_csv(
    '../static/data/bundestagswahl_2013.csv', index=False, encoding='utf-8')