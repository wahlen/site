queue()
    .defer(d3.json, '/data/DEU.topo.json')
    .defer(d3.csv, '/data/bundestagswahl_2013.csv')
    .await(init);
