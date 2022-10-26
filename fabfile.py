# -*- coding: utf-8 -*-
from fabric.api import local, lcd

COUNTRY = 'DEU'
DATA_DIR = 'data'
SHP = 'ne_10m_admin_1_states_provinces_shp'
SHP_SHP = '%s.shp' % SHP
SHP_ZIP = '%s.zip' % SHP


def dl():
    local('curl -L -o %s/%s http://www.naturalearthdata.com/http//www.naturalearthdata.com/download/10m/cultural/%s' % (DATA_DIR, SHP_ZIP, SHP_ZIP))


def extract():
    with lcd(DATA_DIR):
        local('unzip %s' % SHP_ZIP)

def geojson():
    with lcd(DATA_DIR):
        local('ogr2ogr -f GeoJSON -where "sr_adm0_a3 IN (\'%s\')" subunits.json %s' % (COUNTRY, SHP_SHP))


def topojson():
    with lcd(DATA_DIR):
        #FIXME use "code_hasc": "DE.NW"?
        local('topojson --id-property su_a3 -p NAME=name -p name -o %s.topo.json subunits.json' % COUNTRY)
        local('mv subunits.json %s.geo.json' % COUNTRY)


def json():
    geojson()
    topojson()
