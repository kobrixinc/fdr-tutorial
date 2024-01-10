# Welcome to the FDR Tutorial!

This is a hands on introduction to the FDR library. A simple application is used in order to illustrate the core concepts. The application uses the VueJS framework, but the same architectural approach will work with any of the other major GUI frameworks. We will briefly explain VueJS concepts as we go. Such explanations are marked as block quotes that look like this:

>**VueJS** Explanation of VueJS specific aspect. If you are familiar with VueJS, you can just ignore these.

The tutorial aims to showcase some of the basic abstractions at the foundation of FDR and how they can be used to develop an interactive application backed by a knowledge graph that gets updated based on user input. No object model is involved, but we are not working directly with triples either. Moreover, you will see how to integrate knowledge from the DBPedia public triplestore and augment it with application specific properties. 


## App Specs

The application is about a hypothetical global organization, with local chapters in various regions/cities where each chapter has its local office, regional lead and a number of members. Some information is simply public knowledge about geographical regions which is available from DBPedia, while other is application specific and following an application specific ontology.

The flow of the application is simple:

- The user is presented with a list of regions to view & edit
- Upon selecting a region, the user sees all its properties where the DBPedia ones are readonly (fixed, public knowledge) and the others can be edited. 

For simplicity, we don't make use of any fancy GUI components or pretty designs. Our purpose is to illustrate the logic flow of data and user interaction.

## Running the app

Start first by cloning and running the application:

1. git clone https://github.com/kobrixinc/fdr-tutorial.git; cd fdr-tutorial
1. npm i
1. npm run serve
1. 

## Code Overview

All code is under `src` except for the top-level `pubic/index.html` which simply has a `div` placeholder for the application. Then following a common Vue 3 practice, we have a few GUI components under `src/components` and some static content (e.g. images) under `src/assets`.

The whole application itself is implemented by a top-level Vue component in `App.vue`. 

>**VueJS** A `.vue` file contains a self-contained component which is a combination of an HTML template, associated JavaScript/TypeScript code and some local (to the component) CSS declarations.

## Application Initialization and Configuration

### The In Memory Triple Store

To use the FDR framework, one needs an instance of the `Graph` interface (ref link to API). And to create a `Graph` instance, one needs a backing store which supports querying for triples as well as adding and removing them. FDR provides out of the box implementations for standard SPARQL endpoints as a backing store, but to make it easier to run this tutorial we instead make use of an in memory triplestore as the backing database for the application. we use the Quadstore (https://www.npmjs.com/package/quadstore) module which provides the storage implementation and the Quadstore-Comunica (https://www.npmjs.com/package/quadstore-comunica) module which provides the SPARQL query engine.

The storage management details are behind the FDR `Triplestore` interface (ref link). The exact same interface is used for any triplestore endpoint and the tutorial's implementation of the in memory version can be used as an example for rolling your own implementations.

### main.ts 

The typical blueprint for the entry point (main) of a Vue 3 application looks like this:

```
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
```

This is what we have in `src/main.ts`, except that we do some FDR related initialization in between (see complete source code at ref). 

1. The in memory triplestore is created and pre-populated from DBPedia there. More details on that part can be found in [[InMemoryStoreImplementation]]. The triplestore is made available in a global variable called "in_memory_store". In a real application, instead of accessing that global variable you would be creating a thin REST client of some sort talking to a backend.

1. Configure the global FDR environment, namely the default language for literal ("en") and some namespaces that we are going to use.

Besides the data preparation, all `main.ts` does is create the top-level App component and initialize it (the `mount` call at the end).

The application then makes use of only one sub-component, for viewing and editing a single city, and that is the `src/componnet/RegionProperties.vue` component.

### The App Component

The top-level `App` component is the entry point to the UI. It is in fact the whole of the UI. It is also responsible for initializing and holding some global objects needed to manage the application UI state. This bit is done in its `created` lifecycle hook.

>**VueJS** The `created` function is invoked by the framework right after a component instance was created, but before it gets included into the display. And another VueJS quirk is the call to the `Object.freeze` function which we do to prevent the graph from becoming a reactive object (which means that all its properties and functions will be recursively tracked for changes, not something we want on a global cache!)

Here is the completed initialization code:

```
  async created() {
    let store = global["in_memory_store"]
    this.graph = Object.freeze(fdr.graph({ store }))
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
```

Let's break it down.

Using the in memory store, the initialization code creates a graph instance which is where data is ultimately read from and written to. Specifically, this will be an instance of `LocalGraph` (ref link), which is a full-blown cache and therefore in general not a lightweight object.Because of that,  we tell VueJS **not** to make it reactive by calling the standard `Object.freeze` function. In a real application some care must be taken where such an object lives - you would want it in some scope whose lifetime is that of the whole application.

Then we run a SPARQL query to obtain a list of cities for the user to chose from. The query result is turned into a UI model (the 'M' of VueJS's MVVM pattern implementation) as a simple map between a city's IRI and its name. The map is in the plain JavaScript object `regions` variable of the component class. It is displayed in the HTML template as a dropdown like this:

```
  Select region <select v-model="selectedCity">
    <option v-for="(text, value) in regions" :key="value" :value="value">
    {{ text }}
    </option>
  </select>
```
>**VueJS** The above code snippet will be straightforward for VueJS programmers. For everyone else, all you need to know is that the DOM option element will have as value the IRI of a city and the label will be its name. The `select` element current selection will be bound to the `selectedCity` member variable. The `v-model` attribute says that this variable is to be the model of the dropdown and VueJS manages changes of that value either from user interaction or from program logic. In particular, a programmer may define a listener to capture any changes to that value, which will we use below.

So far so good. We have not done anything interesting. We have queried an RDF database and showed a list of stuff in it in a dropdown box. But how about we work with a stateful object with properties that we show and change and do so in a persistent way? This is what we do with the currently selected region - we open it in a nested `region-properties` component. The details of what happens in that process and how change gets propagated go at the core of FDR's capabilities.

### View & Edit a Piece Of The Graph

The selection of the regions dropdown is bound to a component variable - `selectedCity` - which holds the IRI of a region. But to have a proper model for the UI interaction, we need more than the id of the entity, we need an actual object that can have UI reactivity.

For that we will use an FDR abstraction that is simple from a modeling perspective, but powerful when it comes to change propagation - a `Subject` (ref link). More on the change propagation bit below, but first think of the `Subject` interface as FDR's representation of an RDF's resource. That is, an arbitrary thing that has properties and relationships - the subject of a `subject-property-object` triple. At the end, it's a bit like a JavaScript object, but the properties of that object are RDF predicates and their values either RDF literals or other subjects.

A `Subject` instance can be obtained from the graph based on the identifier (the IRI) of the subject. For example if we want to work with New York City data from DBPedia, we would do this:

```
// the "dbo:" prefiix gets automatically resolved by the framework,
// based on configuration
let newyorkId = fdr.subjectId("dbr:New_York_City")
let newYorkCity = this.graph.factory.subject(subjectId)
```

Back to the tutorial code, we have a watcher of the `selectedCity` variable which will change when a user selects a new/different city.

>**VueJS** A watcher in VueJS is a function that gets invoked when a specified model variable changes. (Note - why this and not computed property?)

The watcher is responsible for obtaining an object holding the data for that city and assigning it to the `this.city` variable which is then bound as the model of the `region-properties` component for view and edit. Here is the watcher:

```
  selectedCity: async function() {
    let cityId = fdr.subjectId(this.selectedCity)
    let citySubject = this.graph.factory.subject(cityId)
    citySubject = await this.graph.use(citySubject)
    this.city = citySubject.workingCopy(s => reactive(s))
  }
```

Immediately after obtaining an instance of `Subject`, the code does two "strange" things: 

1. It calls the `graph.use` function passing the subject instance and assigning the result (note: does it need to assign?)
1. It then calls the `workingCopy` function of the subject.

Both of those are crucially important to FDR and we need dive into their explanation. 

FDR caches data in the `LocalGraph` instance that we saw above. A `Subject` is a simple, perhaps the simplest, form of a sub-graph that is treated as a single unit and operated on programmatically. FDR aims to provide this and other abstractions that are easy to work with programmatically, but tricky to manage as sets of triples, keeping them in sync and propagating changes in a sensible way.

Now, in general a `Subject` may come up without the need for examining its properties ever arising. For example, if it's itself the value of a property. For this and other reasons, FDR decouples the construction of an object bound to a remote store and the fetching of the actual data. This makes it possible to work with tha data lazily and be explicit about it. That's one important design choice of FDR. And it is why the call to `graph.use` is necessary: it essentially means "please make sure all data for this subject is loaded from the triplestore because I intend to use it". Notice that this is an asynchronous call, unlike `factory.subject()` which is regular function call and may not involve any data fetching.

The other, much more consequential design choice of FDR is exemplified in the last line of the above code snippet. It is the fact that FDR has ownership of objects cached in the `LocalGraph` instance and GUI components do NOT use them directly. Instead, each GUI component obtains a `working copy` of the `LocalGraph` `prime copy`. Changes to a working copy are not seen by anyone else until they are explicitly committed back to the prime copy. Why did FDR take this route?

The main rationale for that choice has to do with reactivity. The major modern front-end frameworks enjoy great success mainly because of their support for reactivity: the automatic synchronization between the browser's DOM and the model (the 'M' from the MVC pattern). A downside of reactivity is like any other automation - sometimes you don't want it or you want to control more when exactly it happens and how it happens. If we let the main of our object of interest, the one that's in the cache, become reactive and accessed by various components, we go back 50 years of software engineering progress to the era of global variables that different parts of the program modify at will. Ok, that's a bit of an exageration, but the larger point remains. Every single model change, regardless of where it comes from, will be immediately reflected on all UI components. So a small change that is part of a larger bit of program logic can very easily put another component in an inconsistent state. The global propagation of every single mutation of a data object breaks encapsulation and leads to hard to control behavior. Therefore, it is better for every UI component to have **its own reactive copy** of the (part of the) model it is working with. This way changes, whether coming from the user or the program logic, are propagated in a more predictable and controlled manner.

People familiar with the VueJS ecosystem may ask: what about VuEx? Doesn't that solve the problem of sharing model state between UI components? It does provide a solution, for sure. It does establish a place to put global models. And it does offer means to explicitly commit changes to them. However, besides being VueJS specific while FDR remains framework agnostic, it has its own limitations. For one, it's an all or nothing affair - you either share an object with all views or not at all. FDR's approach lets you decide which UI components share the same working copy and which will have their own. That said, VueEx can still be used and we might provide some deep integration between FDR's way of dealing with state (i.e. change management) and VuEx.

Back to the last line of the code above:

```
 ...
  this.city = citySubject.workingCopy(s => reactive(s))
...
```

The `workingCopy` method return a complete copy of the original `Subject` where all the changes are recorded as diffs that can be replayed on other instance, or rolled back if need be. The single parameter of `workingCopy` is a function that turns the object into a reactive one - this again is because FDR is UI framework agnostic and has no idea how to make VueJS reactive objects.

That's all it takes an instance of the city we want to view and edit to the `region-properties` component. The latter is a rather simple component, simplicity afforded by all the groundwork we have done so far of preparing what is essentially a sub-graph for viewing and editing leveraging reactivity of our front-end library.

### The RegionProperties Component

The `RegionProperties` component takes the region (a city) to edit as a parameter and presents an interface to view some of its properties and modify others. The read-only properties are the ones coming from the public data source DBPedia while the writable ones are the extra custom properties that our application defines.

>**VueJS** In VueJS components are re-used by embedding them in the HTML template of a parent component. In our case the parent here is the root App component. There is a naming convention the Vue uses which make a component named `RegionProperties` available as a custom HTML tag `region-properties`. Whatever is declared as a "property" of that component via the `props` option in the component definition, can be provided by the parent as an attribute to the custom HTML tag. This is how we are passing the city `Subject` instance as a property to the child component.

The read-only property names are listed in an area and so are the writable properties. Both lists are then looped over in the HTML template with the properties being used as models for the UI. This is just to make the code shorter - a nicer interface will do a better job on the layout and the overall UX. But the main point to note is that the RDF properties are reactive properties of a VueJS model. One may want to create a separate domain model as JavaScript or TypeScript classes, but one can also `Subject`s with their RDF properties directly.

Now, what happens after some properties have been changed by the user? The change will immediately get reflected in the working copy. But not in the primary copy in the cache. And this, we claim, is a good thing. If after some editing you change your mind and revert back to the original value, the primary copy never needs to see that. And other components, watcher, whatever reactive/event handling code might depend on model changes, never ever need to see that. This level of isolation while still having the capability to explicitly commit the change is important to avoid long, unpleasant debugging night.

Committing the changes to the primary code is done when the user clicks on the `Apply` button. The call to `this.region.commit()` will apply all the change made on the working copy to the primary cached instance.

