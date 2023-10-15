<template>
  <img alt="Vue logo" width="200" height="200" src="./assets/logo.png" />
  <div>
    <select v-model="selectedCity">
      <option v-for="(text, value) in regions" :key="value" :value="value">
        {{ text }}
      </option>
    </select>
    <p>Selected Option: {{ selectedCity }}</p>
  </div>
  <region-properties :region="city" v-if="city" />
</template>

<script lang="ts">
import { Subject, fdr, Graph } from '@kobrix/fdr'
import { Bindings } from '@rdfjs/types'
import { Options, Vue } from 'vue-class-component'
import RegionProperties from './components/RegionProperties.vue'

@Options({
  components: {
    RegionProperties,
  },
  watch: {
    selectedCity: async function() {
      let s = this.graph.factory.subject(fdr.subjectId(this.selectedCity))
      this.city = await this.graph.use(s)
      console.log(this.city)
    }    
  }
})
export default class App extends Vue {
  regions: { [key: string]: string } = {}
  selectedCity: string | null = null
  city: Subject | null = null
  graph: Graph | null = null
  
  async created() {
    let store = global["in_memory_store"]
    this.graph = fdr.graph({ store })

    let availableCities = (await store.sparqlSelect({
      queryString: `
      PREFIX dbo: <http://dbpedia.org/ontology/>
      PREFIX foaf: <http://xmlns.com/foaf/0.1/>
      select * where { ?city rdf:type dbo:City . ?city foaf:name ?name } 
    `,
    })) as Array<Bindings>
    availableCities.forEach((binding) => {
      this.regions[binding.get("city")!.value] = binding.get("name")!.value
    })
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>

function Watch(arg0: string) {
  throw new Error("Function not implemented.");
}
