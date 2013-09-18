var map_states_votes = {};

queue()
    .defer(d3.json, '/data/DEU.topo.json')
    .defer(d3.csv, '/data/bundestagswahl_2009.csv')
    .await(init);

function init(error, de, btw) {
    // FIXME handle errors

    // create a mapping from state names to vote data for faster access
    btw.map(function(item, index){
        map_states_votes[item['Bundesland']] = item;
    });

    var vote_dist = getSortedVoteDist(btw, true);
    renderVoteDist(vote_dist);
    renderMap(de);
}


function containerWidth(selector) {
  return parseInt(d3.select(selector).style('width'))
}


function click(a){
    console.log(a.properties.name);
}


function getSortedPartyVotesByState(state_data, vote_num) {
    // Zweitstimme is default
    if (!vote_num) vote_num = 2;
    vote_key = 2 === vote_num ? 'Zweitstimmen' : 'Erststimmen';

    party_votes = [];
    for (key in state_data) {
        if (-1 === key.indexOf(vote_key))
            continue;
        party_votes.push({
            'party': key.split(' ')[0],
            'votes': parseInt(state_data[key])
        });
    }
    party_votes.sort(function(a, b){return b.votes - a.votes});
    return party_votes;
}


function getWinningPartyByState(state_name, vote_num) {
    var party_votes = getSortedPartyVotesByState(map_states_votes[state_name], vote_num);
    // 1st vote with index 0 is total valid votes, i. e. Gültige
    return party_votes[1].party;
}


function getSortedVoteDist(btw, union) {
    var vote_dist = {};
    btw.map(function(state){
        party_votes = getSortedPartyVotesByState(state, 2);
        party_votes.map(function(vote){
            if (!vote_dist.hasOwnProperty(vote.party)) {
                vote_dist[vote.party] = 0;
            }
            vote.votes = isNaN(vote.votes) ? 0 : vote.votes;
            vote_dist[vote.party] += vote.votes;
        });
    });

    // combine CDU and CSU to Union and remove them
    if (union) {
        vote_dist['Union'] = vote_dist['CDU'] + vote_dist['CSU'];
        delete vote_dist['CDU'];
        delete vote_dist['CSU'];
    }

    var entries = d3.entries(vote_dist)
    return entries.sort(function (a, b){ return b.value - a.value });
}


function renderVoteDist(vote_dist) {
    var width = containerWidth('#vote-dist-total'),
        height = width / 1.3,
        barPadding = 7,
        margin = {top: 5, right: 10, bottom: 20, left: 10},
        margin_v = margin.top + margin.bottom;

    var total_valid = vote_dist.shift();
    var len_dist = vote_dist.length;
    var vote_max = vote_dist[0].value;

    var parties = vote_dist.map(function(d){ return d.key });

    var voteScale = d3.scale.linear()
        .domain([0, vote_max])
        .range([0, height - margin_v]);

    var perc = d3.format('.1%');

    var vis = d3.select('#vote-dist-total')
        .append('svg')
        .attr('class', 'box')
        .attr('width', width)
        .attr('height', height + margin_v);

    vis.selectAll('rect')
        .data(vote_dist)
        .enter()
        .append('rect')
        .attr('class', function(d, i) {
            return d.key.toLowerCase();
        })
        .attr('x', function(d, i) {
            return i * (width / len_dist);
        })
        .attr('y', function(d, i) {
            return height - voteScale(d.value);
        })
        .attr('width', width / len_dist - barPadding)
        .attr('height', function(d) { return voteScale(d.value) });

    vis.selectAll('text.bar-x-label')
        .data(vote_dist)
        .enter()
        .append('text')
        .attr('class', 'bar-x-label')
        .text(function(d){ return d.key })
        .attr('x', function(d, i) {
            return i * (width / len_dist);
        })
        .attr('y', function(d) {
            return height + 12;
        })
        .attr('fill', 'black')
        .attr('text-anchor', 'start');

    vis.selectAll('text.value-label')
        .data(vote_dist)
        .enter()
        .append('text')
        .attr('class', 'value-label')
        .text(function(d) {
            return perc(d.value / total_valid.value)
        })
        .attr('x', function(d, i) {
            return i * (width / len_dist);
        })
        .attr('y', margin_v - 4)
        .attr('fill', 'black')
        .attr('text-anchor', 'start');
}


function renderMap(de) {
    var width = containerWidth('#main'),
        height = width * 1.1;

    var path = d3.geo.path();

    var svg = d3.select('#main').append('svg')
        .attr('width', width)
        .attr('height', height);

    var subunits = topojson.object(de, de.objects.subunits);

    var projection = d3.geo.mercator()
        .center([10.5, 51.35])
        .scale(width * height / 180)
        // move a little to the left
        .translate([(width / 2) - 50, height / 2]);

    var path = d3.geo.path()
        .projection(projection)
        .pointRadius(4);

    svg.append('path')
        .datum(subunits)
        .attr('d', path)

    svg.selectAll('.subunit')
        .data(topojson.object(de, de.objects.subunits).geometries)
      .enter().append('path')
        .attr('class', function(d) {
            // determin winning party
            party = getWinningPartyByState(d.properties.name);
            return 'subunit ' + party.toLowerCase();
        })
        .attr('d', path)
        .on('click', click);

    svg.append('path')
        .datum(topojson.mesh(de, de.objects.subunits, function(a,b) {
            if (a!==b || a.properties.name === 'Berlin'|| a.properties.name === 'Bremen') {
                var ret = a;
            }
            return ret;
        }))
        .attr('d', path)
        .attr('class', 'subunit-boundary');

    svg.selectAll('.subunit-label')
        .data(topojson.object(de, de.objects.subunits).geometries)
      .enter().append('text')
        .attr('class', function(d) {
            return 'subunit-label ' + d.properties.name;
        })
        .attr('transform', function(d) { return 'translate(' + path.centroid(d) + ')'; })
        .attr('dy', function(d){
            if(d.properties.name==='Brandenburg') {
                return '2em'
            }
            if(d.properties.name==='Sachsen-Anhalt' || d.properties.name==='Rheinland-Pfalz' || d.properties.name==='Bremen') {
                return '1em'
            }
            return '.35em';
        })
        .text(function(d) { return d.properties.name; });
}