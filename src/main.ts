
import { createApp } from 'vue'
import App from './App.vue'
import { rdfjs, QuadAdded, fdr } from '@kobrix/fdr'
import { SPARQLProtocolClient } from "@kobrix/fdr"
// import {  Quadstore  } from 'quadstore'
// import { BrowserLevel } from 'browser-level'
// import { DataFactory } from 'rdf-data-factory'
// import { Engine } from 'quadstore-comunica'
import { InMemoryTripleStore } from "./inmemstore"
import { Bindings, Literal, NamedNode, Quad } from "@rdfjs/types"

// const backend = new BrowserLevel('quadstore');
// const dataFactory = new DataFactory();
// const store = new Quadstore({ backend, dataFactory });
// const engine = new Engine(store);
// await store.open();
// await store.clear();
// await store.put(dataFactory.quad(dataFactory.namedNode('ex://s'), dataFactory.namedNode('ex://p'), dataFactory.namedNode('ex://o')));
// const stream = await engine.queryBindings(`SELECT * WHERE { ?s ?p ?o }`);
// stream.on('data', console.log);

// let client = new SPARQLProtocolClient("https://dbpedia.org/sparql", "https://dbpedia.org/sparql/statements")

// let G = new LocalGraph(client, "dbpedia")

// let subject = G.factory.subject(new IRISubjectId("http://dbpedia.org/resource/Bulgaria"))

// let data = await G.use(subject)

// console.log(data)

declare global {
  var in_memory_store: InMemoryTripleStore
}

const prefixes: {[key: string]: any}  = {
  "dbr": "http://dbpedia.org/resource/",
  "dbo": "http://dbpedia.org/ontology/",
  "dbp": "http://dbpedia.org/property/",
  "foaf": "http://xmlns.com/foaf/0.1/",
  "ulsini": "http://ulsini.org/ontology/"
}

fdr.resolver.prefixResolver.withPrefixes(prefixes)

async function populateWikidataForCity(store: InMemoryTripleStore, city: string) {
  let dbpedia = new SPARQLProtocolClient("https://dbpedia.org/sparql", "https://dbpedia.org/sparql/statements")
  let sparqlPrexies = Object.keys(prefixes).map(prefix => "PREFIX " + prefix + ": <" + prefixes[prefix] + ">").join("\n")
  let queryResult: Array<object> = await dbpedia.sparqlSelect(
    { queryString: `
    ${sparqlPrexies}
  
    select distinct * where {
      ${city} ?p ?o .
      minus  {  ${city} dbo:wikiPageWikiLink ?o  }
      minus {  ${city} foaf:depiction ?o  }
      minus {  ${city} owl:sameAs ?o }
      minus { ${city} <http://dbpedia.org/property/wikiPageUsesTemplate> ?o }
    }` 
  })
  
  queryResult.forEach( (row: {[index:string]: any}, index: number, array: object[] ) => {
    let jsonToTerm = function(x: {type: string, value: string}): Literal|NamedNode {
        if (x['type'] == 'uri')
          return rdfjs.named(x['value'])
        else // (x['type'] == 'literal')
          return rdfjs.literal(x['value'])
    }
    let prop = jsonToTerm(row['p'] as {type: string, value: string}) as NamedNode
    let value = jsonToTerm(row['o'])  
    let quad = fdr.quad(fdr.named(city), prop, value)
    // console.log(prop.value.toString())
    // if (value.value.toString().indexOf("City") > -1)
    //   console.log(prop, value)
    store.modify([new QuadAdded(quad)])
  })
}

async function populateInmemoryStore() : Promise<InMemoryTripleStore> {
  let store = new InMemoryTripleStore()
  await store.init()
  await populateWikidataForCity(store, "dbr:New_York_City")
  await populateWikidataForCity(store, "dbr:Boston")
  await populateWikidataForCity(store, "dbr:San_Francisco")
  await populateWikidataForCity(store, "dbr:Miami")
  await populateWikidataForCity(store, "dbr:Chicago")
  await populateWikidataForCity(store, "dbr:Dallas")
  await populateWikidataForCity(store, "dbr:Seattle")
  return store
}

let store = global['in_memory_store'] = await populateInmemoryStore()
let x = await store.fetch(fdr.named("dbr:Miami"))
console.log('NY', x)
//select ?c where { ?c a <http://dbpedia.org/ontology/City> }
let A = await store.sparqlSelect({queryString: `
    PREFIX dbo: <http://dbpedia.org/ontology/>

    select * where { ?s ?p dbo:City } 
  `})
console.log((A[0] as Bindings).get('s'))
createApp(App).mount('#app')

