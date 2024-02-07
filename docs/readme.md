<base target="_blank">

## Welcome to the FDR Tutorial!

This is a hands on introduction to the FDR library. A simple application is used in order to illustrate the core concepts. The application uses the VueJS framework, but the same architectural approach will work with any of the other major GUI frameworks. We will briefly explain VueJS concepts as we go. Such explanations are marked as block quotes that look like this:

>**VueJS** Explanation of VueJS specific aspect. If you are familiar with VueJS, you can just ignore these.

The tutorial aims to showcase some of the basic abstractions at the foundation of FDR and how they can be used to develop an interactive application backed by a knowledge graph that gets updated based on user input. No object model is involved, but we are not working directly with triples either. Moreover, you will see how to integrate knowledge from the DBPedia public triplestore and augment it with application specific properties. 


## The App 

Imagine a hypothetical global organization, with local chapters in various cities where each chapter has its local office, regional lead and a number of members. Some information is simply public knowledge about geographical regions and it's available from DBPedia. Other information is application specific and following an application specific ontology.

The flow of the application is simple:

- The user is presented with a list of cities to view & edit
- Upon selecting a city, the user sees all its properties where the DBPedia ones are readonly and the others can be edited. 

For simplicity, we don't make use of any fancy GUI components or pretty designs. Our purpose is to illustrate the logic flow of data and user interaction.

Before looking at the implementation, take a moment to clone and run it locally:

1. git clone https://github.com/kobrixinc/fdr-tutorial.git; cd fdr-tutorial
1. npm i
1. npm run serve
1. go to your browser and see if it's running, select a region/city from the dropdown, change some properties and apply changes

## FDR Basics

Before we get entangled into the complexities of a complete application with all the boilerplate setup and UI interaction logic, let's have a simple REPL style look at some fundamentals. 

For that, after you have made sure you have a running application, open the browser dev console and let's have some fun.

The entry point to the APIs is an instance of [`GraphEnvironment`](https://kobrixinc.github.io/fdr/api/types/GraphEnvironment.html). There is a default environment provided by FDR conveniently called `fdr` and the tutorial sample application exposes it globally. Make sure you have it in your console, by just typing:

```
> fdr
< DefaultFDR {resolver: DefaultNameResolver, config: {…}}
```

Note: In these snippets, the '>' character above indicates your input and the '<' the browser's output. Of course, yuur browser might display differently.

Ok, if you have the `fdr` object available, you are ready to roll. Here is how to create a `Graph` (ref doc) instance:

```
> graph = fdr.graph({store: in_memory_store})
< LocalGraph {env: DefaultFDR, cache: {…}, client: InMemoryTripleStore, factory: L…h.factory_impl,...}
```

The `fdr.graph` function takes a "graph description" as a parameter. This is an object which at a minimum has to provide a backing store (a SPARQL endpoint) for the graph. Here, we are passing a global variable called `in_memory_store`, which is defined during the bootstrap of the tutorial application as an in memory triplestore, loaded with some data just for the tutorial's purpose (more on that below). The returned instance of `Graph` (ref doc) has the role of a smart local cache which knows how to manage changes and makes it easy to interact with a remote instance. 

Next, let's get and display some data. In RDF, the simplest unit of data is the `<subject, predicate, object>` triple. However, with FDR you don't work with triples directly, though you can always get to them if need be. Instead, the simplest piece of data is something called a `Subject` (ref doc) which aggregates all known triples that share the same subject. It is essentially a JavaScript object with properties. Another way to think of it is as a "Resource" from the Resource Description Framework.

To get an instance of `Subject`, you need an identifier - an instance of `SubjectId`. Why isn't this just a plain IRI or a string? Because FDR supports RDF* and hypergraphs and therefore a subject can itself be a triple. You can get a subject id from the `fdr` object:

```
> fdr.subjectId("dbr:New_York_City")
< IRISubjectId {iri: 'http://dbpedia.org/resource/New_York_City'}
```

In addition to `subjectId` and a `graph`, you can create several other important things from the `fdr` object because it aggregates several top-level factories as well as global configuration settings - see the FDR (ref doc) and RDFJS (ref doc) interfaces for example. In particular it has something called a `NameResolver` (ref doc) which lets you configure namespaces your application may be using. The `dbr:` in the snippet above is one such namespace configured by the tutorial sample app. 

Given an identifier, you can obtain a subject from the graph factory:

```
> newyork = graph.factory.subject(fdr.subjectId("dbr:New_York_City"))
< SubjectImpl {id: IRISubjectId, properties: null, changes: Array(0),  …}
```

Every graph has a factory (accessed with `graph.factory` above) The graph factory produces abstractions over triples that the graph is able to handle. The simplest such abstraction is a `Subject`, but there are more to come!

After you create a subject, it is not immediately usable, it's just a shell that you can pass around, or use in the context of relationships (as the object of a property of another subject), but you can't get to its properties yet. This is why in the console output above the properties field is `null`. This is because the data may not be in locall graph cache yet and an asynchronous call may be needed to get it. Here is how you do that:

```
> await graph.use(newyork)
< SubjectImpl {id: IRISubjectId, properties: {…}, changes: Array(0) …}
> newyork.get("dbp:name")
< 'New York'
```

Incidentally, the `graph.use` function will return a promise of its argument ready to use and it also populates it as a side effect, so you could be getting a subject ready to use in one line:

```
> let newyork = await graph.use(graph.factory.subject(fdr.subjectId("dbr:New_York_City")))
```

So far so good. We have our little object-like abstraction that roughly captures the information about an entity in a graph, with its properties which are going to be a mix of literals and other subjects. That already gives us something to work with if we are building an RDF backend application. But an interesting application typically has to modify the data, not just read it and that's where things get complicated. 

FDR aims to alleviate some of the difficulties of managing changes, especially in the context of a complex interactive application. **As a general principle, mutable data is easy to deal with when the mutations are somehow local.** Problems happen when the mutations have unintended side effects or get propagated in some undesirable order between components. So FDR lets you create copies of the main entity and propagate changes back to the primary object explicitly, at the right time of your chosing. Here is an example:

```
> nylocal = newyork.workingCopy()
< Proxy(SubjectLightCopy) {id: IRISubjectId, properties: {…}, changes: Array(0)...})
> nylocal.get("dbp:name")
< 'New York'
> nylocal.set("dbp:name", "Amsterdam")
< Proxy(SubjectLightCopy) {id: IRISubjectId, properties: {…}, changes: Array(1)....})
> nylocal.get("dbp:name")
< 'Amsterdam'
> newyork.get("dbp:name")
< 'New York'
> await nylocal.commit()
< undefined
> newyork.get("dbp:name")
< 'Amsterdam'
```

To quickly narrate what's happening in the above REPL sequence: first we make a *working copy*, called `nylocal`, of the primary cached entity in the graph (our `newyork` variable from above). That copy will have all the properties copied over and any modification won't affect the primary copy. You can see that a `set` of the `dbp:name` of `nylocal` does not change that property in the `newyork` object. The working copy keeps track of all the changes made over time. Then at some point we can apply the changes with the `commit` function and only then the `dbp:name` property will be changed in the primary copy. 

In browser based development, most modern frameworks offers some form of reactivity, or bidirectional binding between a model (a JavaScript object) and a view (an HTML DOM portion). Using FDR, this reactive object will typically be a working copy of a cached entity. To turn the object into a reactive one, you can optionally provide a function that will be applied the copy FDR creates in order to produce a reactive version of it. Here is an example for VueJS 3.0 (this won't run in the console):

```
import { reactive } from 'vue'
....
newyork.workingCopy(x => reactive(x))
```

The suggested architecture here is that each UI component needing to use an RDF backed model would get its own working copy, make mutations locally and commit back a set of cohesive changes instead of every single keystroke triggering a cascading reaction. And When a change is committed to the main copy, at that point, it will get propagated to all other working copies. Let's see that in action, continuing the above console session with the `newyork` primary object and the `nylocal` working copy.

```
> nyother = newyork.workingCopy()
< 'Amsterdam'
> await nyother.set("dbp:name", "Manhattan").commit()
< nylocal.get("dbp:name")
> 'Manhattan'
```

Finally, what happens if you `commit` the primary copy? Well, FDR does what you'd probably expect - it saves the changes to the backing triplestore. Conversely, a push mechanism from the backing store to the application can update the primary copy and trigger further updates to its associated working copies. 

Ok, with this preliminary tour, we are ready to dive into the complete application code.

## Code Overview

All code is under `src` except for the top-level `pubic/index.html` which simply has a `div` placeholder for the application. Then, following a common Vue 3 practice, we have a few GUI components under `src/components` and some static content (e.g. images) under `src/assets`.

The whole application itself is implemented by a top-level Vue component in `App.vue`. 

>**VueJS** A `.vue` file contains a self-contained component which is a combination of an HTML template, associated JavaScript/TypeScript code and some local (to the component) CSS declarations.

The main entry point is in `src/main.ts`. That file would have been 3 lines of code where it not for the need to create a populate a triplestore in memory, so that we don't have to run a server with a SPARQL endpoint. We will explain that in memory triplestore, but that is really not the focus of the tutorial and you can safely skip that part.


## Application Initialization and Configuration

The typical blueprint for the entry point (main) of a Vue 3 application looks like this:

```
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
```

This is what we have in `src/main.ts`, except that we do some FDR related initialization in between (see complete source code at ref). 

1. The in memory triplestore is created and pre-populated from DBPedia there. More details on that part can be found in [InMemoryStoreImplementation](#the-in-memory-triple-store). The triplestore is made available in a global variable called "in_memory_store". In a real application, instead of accessing that global variable you would be creating a thin REST client of some sort talking to a backend.

1. Configure the global FDR environment, namely the default language for literal ("en") and some namespaces that we are going to use. The namespaces are configured as a set of prefixes that are then added to the ones available by default via a call to `fdr.resolver.prefixResolver.withPrefixes`. 

Besides the data preparation, all `main.ts` does is create the top-level App component and initialize it (the `mount` call at the end).

The application then makes use of only one sub-component, for viewing and editing a single city, and that is the `src/componnet/RegionProperties.vue` component.

## The App Component

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

Using the in memory store, the initialization code creates a graph instance which is where data is ultimately read from and written to. Specifically, this will be an instance of `LocalGraph` (ref link), which is a full-blown cache and therefore in general not a lightweight object. Because of that, we tell VueJS **not** to make it reactive by calling the standard `Object.freeze` function. In a real application some care must be taken where such an object lives - you would want it in some scope whose lifetime is that of the whole application.

Then we run a SPARQL query to obtain a list of cities for the user to chose from. The query result is turned into a UI model (the 'M' of VueJS's MVVM pattern implementation) as a simple map between a city's IRI and its name. The map is in the plain JavaScript object `regions` variable of the component class. It is displayed in the HTML template as a dropdown like this:

```
  Select region <select v-model="selectedCity">
    <option v-for="(text, value) in regions" :key="value" :value="value">
    {{ text }}
    </option>
  </select>
```
>**VueJS** The above code snippet will be straightforward for VueJS programmers. For everyone else, all you need to know is that the DOM option element will have as value the IRI of a city and the label will be its name. The `select` element current selection will be bound to the `selectedCity` member variable. The `v-model` attribute says that this variable is to be the model of the dropdown and VueJS manages changes of that value either from user interaction or from program logic. In particular, a programmer may define a listener to capture any changes to that value, which will we use below.

So far so good. We have not done anything interesting. We have queried an RDF database and showed a list of stuff in it in a dropdown box. But how about we work with a stateful object with properties that we show and change and do so in a persistent way? This is what we do with the currently selected region - we open it in a nested `region-properties` component. The details of what happens in that process and how change gets propagated go at the core of FDR's capabilities. We've seen the fundamental APIs at play above in the [FDR Basics](#fdr-basics) section.

## View & Edit a Piece Of The Graph

The selection of the regions dropdown is bound to a component variable - `selectedCity` - which holds the IRI of a region. But to have a proper model for the UI interaction, we need more than the id of the entity, we need an actual object that can have UI reactivity.

For that we will use the `Subject` FDR abstraction introduced above. It is simple from a modeling perspective, but powerful when it comes to change propagation. As noted above, on can think of the `Subject` interface as FDR's representation of an RDF's resource. From a programmatic perspective, it is a bit like a JavaScript object, but the properties are RDF predicates with values either RDF literals or other subjects.

We showed above how to obtain a `Subject` instance from the graph based on the identifier (the IRI) of the subject. Now back to the tutorial code, we have a watcher of the `selectedCity` variable which will change when a user selects a new/different city.

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

Immediately after obtaining an instance of `Subject`, the code does two things: 

1. It calls the `graph.use` function passing the subject instance and assigning the result (note: does it need to assign?)
1. It then calls the `workingCopy` function of the subject.

Both of those are key to how FDR manages data so let's review a bit more. 

FDR caches data in the `LocalGraph` instance that we saw above. A `Subject` is the simplest form of a sub-graph that is treated as a single unit and operated on programmatically. FDR aims to provide this and other abstractions that are easy to work with programmatically, but tricky to manage as sets of triples, keeping them in sync and propagating changes in a sensible way.

Now, in general a `Subject` instance may come into play without the need for examining its properties ever arising. For example, if it's itself the value of a property. For this and other reasons, FDR decouples the construction of an object bound to a remote store and the fetching of the actual data. In fact, the `Subject` interface inherit from an even more abstract interface called `DataSpec` (ref doc) which is intended to make it possible to work with data lazily and be explicit about it. That's one important design choice of FDR. A `DataSpec` captures enough information to go get the data when it is actually needed. And it is why the call to `graph.use` is necessary: it essentially means "please make sure all data for this subject is loaded from the triplestore because I intend to use it". Naturally this is an asynchronous call, unlike `factory.subject()` which is regular function call and may not involve any data fetching.

The other, much more consequential design choice of FDR is exemplified in the last line of the above code snippet. It is the fact that FDR has ownership of objects cached in the `LocalGraph` instance and GUI components do NOT use them directly. Instead, each GUI component obtains a `working copy` of the `LocalGraph` 's `primary copy`. Changes to a working copy are not seen by anyone else until they are explicitly committed back to the prime copy. Why did FDR take this route?

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

## The RegionProperties Component

The `RegionProperties` component takes the region (a city) to edit as a parameter and presents an interface to view some of its properties and modify others. The read-only properties are the ones coming from the public data source DBPedia while the writable ones are the extra custom properties that our application defines.

>**VueJS** In VueJS components are re-used by embedding them in the HTML template of a parent component. In our case the parent here is the root App component. There is a naming convention the Vue uses which make a component named `RegionProperties` available as a custom HTML tag `region-properties`. Whatever is declared as a "property" of that component via the `props` option in the component definition, can be provided by the parent as an attribute to the custom HTML tag. This is how we are passing the city `Subject` instance as a property to the child component.

The read-only property names are listed in an area and so are the writable properties. Both lists are then looped over in the HTML template with the properties being used as models for the UI. This is just to make the code shorter - a nicer interface will do a better job on the layout and the overall UX. But the main point to note is that the RDF properties are reactive properties of a VueJS model. One may want to create a separate domain model as JavaScript or TypeScript classes, but one can also `Subject`s with their RDF properties directly.

Now, what happens after some properties have been changed by the user? The change will immediately get reflected in the working copy. But not in the primary copy in the cache. And this, we claim, is a good thing. If after some editing you change your mind and revert back to the original value, the primary copy never needs to see that. And other components, watcher, whatever reactive/event handling code might depend on model changes, never ever need to see that. This level of isolation while still having the capability to explicitly commit the change is important to avoid long, unpleasant debugging night.

Committing the changes to the primary code is done when the user clicks on the `Apply` button. The call to `this.region.commit()` will apply all the change made on the working copy to the primary cached instance.


## The In Memory Triple Store

To use the FDR framework, one needs an instance of the `Graph` interface (ref link to API). And to create a `Graph` instance, one needs a backing store which supports querying for triples as well as adding and removing them. FDR provides out of the box implementations for standard SPARQL endpoints as a backing store, but to make it easier to run this tutorial we instead make use of an in memory triplestore as the backing database for the application. we use the Quadstore (https://www.npmjs.com/package/quadstore) module which provides the storage implementation and the Quadstore-Comunica (https://www.npmjs.com/package/quadstore-comunica) module which provides the SPARQL query engine.

The storage management details are behind the FDR `Triplestore` interface (ref link). The exact same interface is used for any triplestore endpoint and the tutorial's implementation of the in memory version can be used as an example for rolling your own implementations. We won't go into detail about this code (the `src/inmemstore.ts` implementation), but will gladly answer any questions you might have.

In `src/main.ts` , the starting point for building the store is `populateInmemoryStore` which simple creates and initializes the instance and then invokes the auxiliary function `populateWikidataForCity` to fetch DBPedia triples about a given city and write them to the in memory store.

## What Next?

This tutorial does cover all the basics in a fair amount of detail. FDR will be progressing as practical programming patterns using the semantic tech stack emerge. The API docs and the reference guide are your next documentation companions. It is based on the RDFJS APIs (ref link). To interact with us, please join the Github discussions, submit questions, suggestions etc. 

