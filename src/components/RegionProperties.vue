<template>
  <h1>{{region.get("foaf:name")}}</h1>
  <table>
    <tr v-for="prop in readonlyProperties" :key="prop">
      <td>{{prop}}</td><td>{{region.get(prop)}}</td>
    </tr>
  </table>
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component'
import { Subject, SubjectImpl } from '@kobrix/fdr'
import { PropType } from 'vue'

@Options(
  {
    props: [
      "region"
    ]
  }
)
export default class RegionProperties extends Vue {
  region!: Subject
  readonlyProperties = ["dbo:populationTotal", 
                        "dbo:abstract",
                        "dbp:areaLandKm", 
                        "dbp:elevationM", 
                        "dbp:establishedTitle"
                      ]
}
</script>                                       

<style>

</style>