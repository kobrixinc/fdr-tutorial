import { fdr, rdfjs, QuadAdded, QuadChange, SPARQLProtocolClient } from "@kobrix/fdr"
import { InMemoryTripleStore } from "./inmemstore.js"
import { Literal, NamedNode, Quad } from "@rdfjs/types"

// console.log('Hello world!')

fdr.resolver.prefixResolver.withPrefixes({ 
  "dbr" : "http://dbpedia.org/resource/",
  "dbo" : "http://dbpedia.org/ontology/"
})

let store = new InMemoryTripleStore()

await store.init()
let r = await store.modify([
  new QuadAdded(rdfjs.quad(rdfjs.named("kobrix:fdr"), 
                          rdfjs.named("rdfs:label"), 
                          rdfjs.literal("Framework for Describing Resources"))
  )
])

console.log('changed ', r)

let data = await store.fetch(rdfjs.named("kobrix:fdr"))
console.log('fetched ', data)

let dbpedia = new SPARQLProtocolClient("https://dbpedia.org/sparql", "https://dbpedia.org/sparql/statements")
// let triples = await dbpedia.fetch(rdfjs.named("http://dbpedia.org/resource/Bulgaria"))
let queryResult: Array<object> = await dbpedia.sparqlSelect(
  { queryString: `
  PREFIX dbo: <http://dbpedia.org/ontology/>
  PREFIX dbr: <http://dbpedia.org/resource/>
  PREFIX foaf: <http://xmlns.com/foaf/0.1/>

  select distinct * where {
  dbr:New_York_City ?p ?o .
  minus  {  dbr:New_York_City dbo:wikiPageWikiLink ?o  }
  minus {  dbr:New_York_City foaf:depiction ?o  }
  minus {  dbr:New_York_City owl:sameAs ?o }
  minus { dbr:New_York_City <http://dbpedia.org/property/wikiPageUsesTemplate> ?o }
  }` 
})

queryResult.forEach( (row: {[index:string]: any}, index: number, array: object[] ) => {
  let jsonToTerm = function(x: {type: string, value: string}): Literal|NamedNode {
      if (x['type'] == 'uri')
        return rdfjs.named(x['value'])
      else // if (x['type'] == 'literal')
        return rdfjs.literal(x['value'])
  }
  // let a: { p: string, v: }
  let prop = jsonToTerm(row['p'] as {type: string, value: string}) as NamedNode
  let value = jsonToTerm(row['o'])

  // console.log('dbr:New_York_City', prop, value)
  // if (row.hasOwnProperty("metaproperty")) {
  //     quads.push(rdfjs.metaQuad(rdfjs.quad(subject, prop, value), this.jsonToTerm(row["metaproperty"]), this.jsonToTerm(row["metavalue"])));
  // }
  // else if (self.propertyFilter.call(self, prop) &&
  //     self.valueFilter.call(self, value)) {
  //     quads.push(rdfjs.quad(subject, prop, value));
  // }

  let quad = rdfjs.quad(rdfjs.named("dbr:New_York_City"), prop, value)
  store.modify([new QuadAdded(quad)])

})

let copied = await store.fetch(rdfjs.named("dbr:New_York_City"))
copied.forEach(console.log)