// Implements an in memory TripleStore that can be used through the same interface as a 
// remote endpoint would.

import { QuadAdded, QuadChange, QuadRemoved, SPARQLEndpoint, TripleStore } from "@kobrix/fdr";
import {  Quadstore  } from 'quadstore'
import { DataFactory } from 'rdf-data-factory'
import { Engine } from 'quadstore-comunica'
import { NamedNode, Dataset, Quad } from "rdf-js"
import { AbstractLevel } from 'abstract-level'
import { MemoryLevel } from "memory-level"
import rdf from 'rdf-ext'

export class InMemoryTripleStore implements TripleStore, SPARQLEndpoint {
  //@ts-ignore
  readonly backend: AbstractLevel
  readonly dataFactory: DataFactory
  readonly store: Quadstore
  private engine: Engine

  constructor() {
    this.backend = new MemoryLevel() //new BrowserLevel('quadstore-fdr-tutorial')
    this.dataFactory = new DataFactory()
    this.store = new Quadstore({ backend: this.backend, dataFactory: this.dataFactory })
    this.engine = new Engine(this.store)
  }

  async init() {
    await this.store.open();
  }

  async fetch(...subjects: (Quad | NamedNode<string>)[]): Promise<Dataset<Quad>> {
    const quads: Array<Quad> = []
    await Promise.all(subjects.map(async x => {
      const pattern = { subject: x }
      let A = await this.store.get(pattern) 
      quads.push.apply(quads, A.items)
    }))
    //@ts-ignore
    return rdf.dataset(quads)
  }

  async modify(changes: Array<QuadChange>): Promise<{ok:boolean, error? : string }>  {
    try {
      await Promise.all(changes.map(async ch => {
        if (ch instanceof QuadAdded) {
          await this.store.put((ch as QuadAdded).quad)
        }
        else if (ch instanceof QuadRemoved) {
          await this.store.del((ch as QuadAdded).quad)
        }
      }))
      return {ok:true}
    }
    catch (e) {
      return {ok:false, error: e as string}
    }    
  }
 
  sparqlSelect(query: { queryString: string; }): Promise<object[]> {
    return new Promise<object[]>((resolve, reject) => {
      this.engine.queryBindings(query.queryString).then(bindingsStream => {
        let result: object[] = []
        bindingsStream.on('data', binding => {
          result.push(binding)
        })
        bindingsStream.on('end', () => {
          resolve(result)
        })
        bindingsStream.on('error', error => {
          reject(error)
        })
      }).catch(reject)
    })
  }
}