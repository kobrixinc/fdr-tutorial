import { createApp } from 'vue'
import App from './App.vue'
import { make, LocalGraph, IRISubjectId } from '@kobrix/fdr'
import { SPARQLProtocolClient } from "@kobrix/fdr"
import {  Quadstore  } from 'quadstore'
import { BrowserLevel } from 'browser-level'
import { DataFactory } from 'rdf-data-factory'
import { Engine } from 'quadstore-comunica'

const backend = new BrowserLevel('quadstore');
const dataFactory = new DataFactory();
const store = new Quadstore({ backend, dataFactory });
const engine = new Engine(store);
await store.open();
await store.clear();
await store.put(dataFactory.quad(dataFactory.namedNode('ex://s'), dataFactory.namedNode('ex://p'), dataFactory.namedNode('ex://o')));
const stream = await engine.queryBindings(`SELECT * WHERE { ?s ?p ?o }`);
stream.on('data', console.log);

// let client = new SPARQLProtocolClient("https://dbpedia.org/sparql", "https://dbpedia.org/sparql/statements")

// let G = new LocalGraph(client, "dbpedia")

// let subject = G.factory.subject(new IRISubjectId("http://dbpedia.org/resource/Bulgaria"))

// let data = await G.use(subject)

// console.log(data)

createApp(App).mount('#app')

