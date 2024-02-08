<template>
  <div class="form-group">
    <h1>{{region.get("foaf:name")}}</h1>

    <table>
      <tr v-for="prop in readonlyProperties" :key="prop">
        <td><label>{{prop}}</label></td><td>{{region[prop]}}</td>
      </tr>       
      <tr v-for="prop in customProperties" :key="prop">
        <td><label>{{prop}}</label></td><td><input v-model="region[prop]"></td>
      </tr>
    </table>

    <button @click="region.commit()">Apply</button>
  </div>
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component'
import { Subject } from '@kobrix/fdr'

@Options({
  props: [
    "region"
  ]
})
export default class RegionProperties extends Vue {
  region!: Subject
  readonlyProperties = ["dbo:populationTotal", 
                        "dbo:abstract",
                        "dbp:areaLandKm", 
                        "dbp:elevationM", 
                        "dbp:establishedTitle"
                      ] 
  customProperties = [
    "ghf:regionalLead",
    "ghf:localAddress",
    "ghf:memberCount"
  ]
}
</script>                                       

<style>

</style>