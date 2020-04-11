import React, { useState, useEffect } from 'react';
import './App.css';
import TextField from '@material-ui/core/TextField';

import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import MaterialTable from 'material-table';

import Cell from './cell';

const axios = require('axios');

function getData(name, mode, raid) {
  const zone = {bwl: 1002, mc: 1000}[raid];
  const endpoint = `https://classic.warcraftlogs.com/v1/rankings/character/${name}/mograine/eu?timeframe=historical&zone=${zone}&metric=${mode}&api_key=132a01b354cc449877041836205ca398`;
  return axios.get(endpoint);
}

function round1dp(num) {
  return Math.round(num * 10) / 10;
}

function formatData(fd, suffix = null) {
  if (!fd.length) return null;
  const characterName = fd[0] && (suffix ? fd[0].characterName + ` ${suffix}` : fd[0].characterName);
  const playerClass = fd[0] && fd[0].class;
  const itemLevel = fd.length && fd.map(el => el.ilvlKeyOrPatch).reduce((prev, curr) => curr += prev) / fd.length;
  const mean = fd.length && fd.map(el => el.percentile).reduce((prev, curr) => curr += prev) / fd.length;
  const best = Math.max(...fd.map(el => el.percentile));
  return {
    characterName,
    playerClass,
    itemLevel: round1dp(itemLevel),
    mean: round1dp(mean),
    best: round1dp(best)};
}

function App() {

  const [mode, setMode] = useState('dps');
  const [raid, setRaid] = useState('bwl');

  const [input, setInput] = useState('');
  const [names, setNames] = useState('');
  const [data, setData] = useState([]);

  async function getParses(names, mode) {
    const promises = names.map(n => new Promise(async resolve => {
      try {
        const res = await getData(n, mode, raid);
        resolve(res);
      } catch(e) {
        resolve({data: []});
      }
    }));

    let data = await Promise.all(promises);
    data = data.map(i => {
      const spec = mode === 'dps' ?  /^(dps|tank)$/ :  /^(healer)$/;
      const fd = i.data.filter(i => i.spec.toLowerCase().match(spec));
      if (!fd.length) return null;
      if (mode === 'dps') {
        const subdata = [
          formatData(fd.filter(i => i.spec.toLowerCase().match(/^(tank)$/)), '(Tank)'),
          formatData(fd.filter(i => i.spec.toLowerCase().match(/^(dps)$/)))
        ];
        const tankParseExists = Boolean(subdata[0]);
        const dpsParseExists = Boolean(subdata[1]);
        if (tankParseExists && dpsParseExists) return subdata[0].mean > subdata[1].mean ? subdata[0] : subdata[1];
        else if (tankParseExists && !dpsParseExists) return subdata[0];
        else if (!tankParseExists && dpsParseExists) return subdata[1];
      }
      else {
        return formatData(fd);
      }
    });
    setData(data);
  }

  useEffect(() => {
    if (names) {
      getParses(names.split(' '), mode);
    }
  }, [names, mode, raid]);

  return (
    <div className="App">
      <form method="get" noValidate autoComplete="off" onSubmit={(e) => {
        e.preventDefault();
        setNames(input);
      }}>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 10, }}>
        <TextField
            id="standard-basic"
            label="List of players"
            style={{width: '95%', marginRight: 50, marginLeft: 50, marginBottom: 10}}
            onChange={e => setInput(e.target.value)}
          />
          <div style={{display: 'flex', flexDirection: 'row', alignContent: 'space-evenly', width: 400, justifyContent: 'space-around'}}>
            <Select
              labelId="demo-simple-select-label2"
              id="demo-simple-select2"
              value={raid}
              onChange={ev => setRaid(ev.target.value)}
              style={{width: 150}}
            >
              <MenuItem value={'bwl'}>Blackwing Lair</MenuItem>
              <MenuItem value={'mc'}>Molten Core</MenuItem>
            </Select>
            <Select
              labelId="demo-simple-select-label"
              id="demo-simple-select"
              value={mode}
              onChange={ev => setMode(ev.target.value)}
              style={{width: 150}}
            >
              <MenuItem value={'dps'}>Damage</MenuItem>
              <MenuItem value={'hps'}>Healing</MenuItem>
            </Select>
          </div>
        </div>

        <div style={{margin: 20}}>
          <MaterialTable
            title=""
            style={{boxShadow: 'none'}}
            columns={[
              { title: 'Player', field: 'characterName' },
              { title: 'Class', field: 'playerClass' },
              { title: 'iLvl', field: 'itemLevel', type: 'numeric' },
              { title: 'Mean (all parses)', field: 'mean', type: 'numeric' },
              { title: 'Best (single fight parse)', field: 'best', type: 'numeric' },
            ]}
            data={data.flat().filter(el => !!el)}        
            options={{
              sorting: true,
              search: false,
              paging: false,
              headerStyle: {
                fontWeight: 'bold'
              }
            }}
            components={{
              Cell: props => (
                <Cell {...props}/>
              )
            }}
          />
        </div>
        
      </form>
    </div>
  );
}

export default App;
