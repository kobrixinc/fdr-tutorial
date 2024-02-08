import { createApp } from 'vue'
import App from './App.vue'
import { rdfjs, QuadAdded, fdr } from '@kobrix/fdr'
import { SPARQLProtocolClient } from "@kobrix/fdr"
import { InMemoryTripleStore } from "./inmemstore"
import { Literal, NamedNode } from "@rdfjs/types"

// We use an RDF Triplestore that is constructed in memory by
// fetching some triples about major US cities from DBPedia.
// The store implementation is a global variable so that it can
// be easily accessed from the root GUI component.
declare global {
  var in_memory_store: InMemoryTripleStore
}

// The prefixes are the standard ones used in DBPedia 
// except for the last one - 'ghf' - which is for our
// hypothetical organization.
const prefixes: {[key: string]: any}  = {
  "dbr": "http://dbpedia.org/resource/",
  "dbo": "http://dbpedia.org/ontology/",
  "dbp": "http://dbpedia.org/property/",
  "foaf": "http://xmlns.com/foaf/0.1/",
  "ghf": "http://green-horizon-foundation.org/ontology/"
}

// It is possible to implement any logic you want as name
// resolution, but using prefixes being the most common one,
// it is provided as a default by FDR. The 'withPrefixes'
// function just adds to the existing prefix map.
fdr.resolver.prefixResolver.withPrefixes(prefixes)

// This function copies the triples where a given 'city' (an IRI) is the subject
// to the in memory store. 
// It makes use a Triplestore implementation provided by FDR which works with a 
// backing endpoint, in this case DBPedia. We did not want to use DBPedia directly
// as the backing triplestore because we cannot write to it. 
async function populateWikidataForCity(store: InMemoryTripleStore, city: string) {
  let dbpedia = new SPARQLProtocolClient("https://dbpedia.org/sparql", "https://dbpedia.org/sparql/statements")
  let sparqlPrexies = Object.keys(prefixes).map(prefix => "PREFIX " + prefix + ": <" + prefixes[prefix] + ">").join("\n")
  let qs = `
  ${sparqlPrexies}

  select distinct * where {
    ${city} ?p ?o .
    minus  {  ${city} dbo:wikiPageWikiLink ?o  }
    minus {  ${city} foaf:depiction ?o  }
    minus {  ${city} owl:sameAs ?o }
    minus { ${city} <http://dbpedia.org/property/wikiPageUsesTemplate> ?o }
  }` 
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
    type InJson = {type: string, value: string, 'xml:lang': string}
    let jsonToTerm = function(x: InJson): Literal|NamedNode {
        if (x['type'] == 'uri')
          return rdfjs.named(x['value'])
        else
          return rdfjs.literal(x['value'], x['xml:lang'])
    }
    let prop = jsonToTerm(row['p'] as InJson) as NamedNode
    let value = jsonToTerm(row['o'])  
    let quad = fdr.quad(fdr.named(city), prop, value)
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

global['in_memory_store'] = await populateInmemoryStore()
// The default language of literal is English and 
// its presence is optional as indicated by the question mark.
fdr.config.lang = "en?" 
// Making the fdr object global is not needed by the application strictly
// speaking, but it's useful to interact with the API and the data through
// the browser console.
global['fdr'] = fdr
createApp(App).mount('#app')

