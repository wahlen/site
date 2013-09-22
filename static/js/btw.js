var btw_results = null,
    map_states_votes = {},
    inactive_regions = {},
    tooltip_div = d3.select('#tooltip'),
    sel_vote_dist = '#vote-dist-total';

queue()
    .defer(d3.json, '/data/DEU.topo.json')
    .defer(d3.csv, '/data/bundestagswahl_2009.csv')
    .await(init);

function init(error, de, btw) {
    // FIXME handle errors

    btw_results = btw;

    // create a mapping from state names to vote data for faster access
    btw.map(function(item, index){
        map_states_votes[item['Bundesland']] = item;
    });

    var vote_dist = getSortedVoteDist(btw, 2);
    renderVoteDist(sel_vote_dist, vote_dist);
    //renderSeatDist();
    renderMap(de);
}


function containerWidth(selector) {
  return parseInt(d3.select(selector).style('width'))
}


function toggleRegion(d, i){
    //console.log(d.properties.attr('fill', '#fff'))

    var name = d.properties.name;
    if (inactive_regions.hasOwnProperty(name)) {
        d3.select(this).style('fill', null);
        delete inactive_regions[name];
    }
    else {
        d3.select(this).style('fill', '#fff');
        inactive_regions[name] = true;
    }
    var btw = btw_results.filter(function(item, index){
        return inactive_regions.hasOwnProperty(item['Bundesland']) ? false : true;
    });
    if (vote_dist = getSortedVoteDist(btw, 2))
        renderVoteDist(sel_vote_dist, vote_dist);
    else
        d3.selectAll(sel_vote_dist + ' svg').remove();
}


function getSortedPartyVotesByState(state_data, vote_num) {
    // Zweitstimme is default
    if (!vote_num) vote_num = 2;
    vote_key = 2 === vote_num ? 'Zweitstimmen' : 'Erststimmen';

    party_votes = [];
    for (key in state_data) {
        if (!state_data[key]) continue;

        if (-1 === key.indexOf(vote_key))
            continue;
        party_votes.push({
            'key': key.split(' ')[0],
            'value': parseInt(state_data[key])
        });
    }
    party_votes.sort(function(a, b){return b.value - a.value});
    return party_votes;
}


function getWinningPartyByState(state_name, vote_num) {
    var party_votes = getSortedPartyVotesByState(map_states_votes[state_name], vote_num);
    // 1st vote with index 0 is total valid votes, i. e. Gültige
    return party_votes[1].key;
}


function getSortedVoteDist(btw, vote_num) {
    if (!vote_num) vote_num = 2;

    var vote_dist = {};
    btw.map(function(state){
        party_votes = getSortedPartyVotesByState(state, vote_num);
        party_votes.map(function(vote){
            if (!vote_dist.hasOwnProperty(vote.key)) {
                vote_dist[vote.key] = 0;
            }
            vote.value = isNaN(vote.value) ? 0 : vote.value;
            vote_dist[vote.key] += vote.value;
        });
    });

    var entries = d3.entries(vote_dist)
    return entries.sort(function (a, b){ return b.value - a.value });
}


function renderSeatDist() {

    vote_dist = getSortedVoteDist(btw_results, 2);

    party_map = {};
    vote_dist.map(function(i){
        //if (i.key !== 'Gültige' && i.key !== 'Sonstige') {
        // for 2009 igonre parties below 5%
        var ex = ['Gültige', 'PIRATEN', 'NPD'];
        if (false === ex.indexOf(i.key)) {
            party_map[i.key] = i.value;
        }
    });
    var mandates = Bundestagswahl.saint_lague_iterative(party_map, 598, {})
    console.log(mandates);
}


function renderVoteDist(selector, vote_dist) {
    d3.selectAll(selector + ' svg').remove();

    // if only total left do nothing more
    if (1 == vote_dist.length)
        return;

    var width = containerWidth(selector),
        height = width / 1.6,
        barPadding = 7,
        margin = {top: 5, right: 10, bottom: 20, left: 10},
        margin_v = margin.top + margin.bottom;

    var total_valid = vote_dist.shift();
    var total_displayed_parties = d3.sum(vote_dist, function(d) {
        return d.value;
    });
    vote_dist.push({
        key: 'Sonstige',
        value: total_valid.value - total_displayed_parties
    });

    var len_dist = vote_dist.length;
    var vote_max = vote_dist[0].value;

    var parties = vote_dist.map(function(d){ return d.key });

    var voteScale = d3.scale.linear()
        .domain([0, vote_max])
        .range([0, height - margin_v]);

    var perc = d3.format('.1%');

    var vis = d3.select(selector)
        .insert('svg')
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
        height = width * 1.2;

    var path = d3.geo.path();

    var svg = d3.select('#main').append('svg')
        .attr('width', width)
        .attr('height', height);

    var subunits = topojson.feature(de, de.objects.subunits);

    var projection = d3.geo.mercator()
        .center([10.5, 51.35])
        .scale(width * height / 150)
        // move a little to the left
        .translate([(width / 2) - 50, height / 2]);

    var path = d3.geo.path()
        .projection(projection)
        .pointRadius(4);

    svg.append('path')
        .datum(subunits)
        .attr('d', path)

    svg.selectAll('.subunit')
        .data(topojson.feature(de, de.objects.subunits).features)
      .enter().append('path')
        .attr('class', function(d) {
            party = getWinningPartyByState(d.properties.name);
            return 'subunit ' + party.toLowerCase();
        })
        .attr('d', path)
        .on('click', toggleRegion)
        .on('mouseover', tooltipShow)
        .on('mouseout', tooltipHide);

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
        .data(topojson.feature(de, de.objects.subunits).features)
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


function tooltipShow(d) {
    var off_y = 280,
        off_x = 170;
    var e = d3.event;
    var party_votes = getSortedPartyVotesByState(
        map_states_votes[d.properties.name], 2);
    tooltip_div.transition()
        .duration(200)
        .style('opacity', 1);
    // Don't let tooltip move out of top, also move left if top reached, so
    // states are visible.
    tooltip_div
        .style('left', function(d) {
            var offset_x = e.pageX - off_x;
            if (e.pageY - off_y < 0) {
                offset_x -= off_x + 30;
            }
            return offset_x + 'px';
        })
        .style('top', function(d) {
            var offset_y = e.pageY - off_y;
            if (offset_y < 0) {
                offset_y += -offset_y;
            }
            return offset_y + 'px';
        });
    d3.select('#tooltip-title').text(d.properties.name);
    renderVoteDist('#country-votes', party_votes);
}


function tooltipHide(d) {
    tooltip_div.transition()
        .duration(500)
        .style('opacity', 0);
}