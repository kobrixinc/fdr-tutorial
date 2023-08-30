import { MemoryLevel } from 'memory-level'
import * as quadstore from 'quadstore'
import { DataFactory } from 'rdf-data-factory'
import { Engine } from 'quadstore-comunica'
// import SparqlEngine from 'quadstore-sparql'
import { HttpServer } from 'quadstore-http'

const db = new MemoryLevel()
const df = new DataFactory();
const store = new quadstore.Quadstore( { backend: db, dataFactory: df } )
// const sparqlEngine = new SparqlEngine(rdfStore);
const engine = new Engine(store);

const opts = {
  baseUrl: 'http://127.0.0.1:8080'
};
const server = new HttpServer(store, engine, opts);

server.listen(8080, '127.0.0.1', (err: any) => {
  if (err) throw err;
  console.log(`Listening!`);
});