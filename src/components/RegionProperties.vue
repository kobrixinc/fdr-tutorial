<template>
  <h1>{{region.get("foaf:name")}}</h1>

  <div>
    <input v-model="region['foaf:name']" v-show="region"/>
  </div>
  <table>
    <tr v-for="prop in readonlyProperties" :key="prop">
      <td>{{prop}}</td><td>{{region[prop]}}</td>
    </tr>       
  </table>

  <table>
    <tr v-for="prop in customProperties" :key="prop">
      <td>{{prop}}</td><td><input v-model="region[prop]"></td>
    </tr>       
  </table>

</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component'
import { Subject } from '@kobrix/fdr'

@Options({
  props: [
    "region"
  ],
  watch: {
    region: function (newRegion, currentRegion) {
      if (currentRegion)
        currentRegion.commit()
    }
  }
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
    "ulsini:regionalLead",
    "ulsini:localAddress",
    "ulsini:memberCount"
  ]
}
</script>                                       

<style>

</style>