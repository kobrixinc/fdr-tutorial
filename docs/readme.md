# Welcome to the FDR Tutorial!

This is a step by step hands on introduction to the FDR library. It will show you how to install, configure and run a complete  application. The application uses the VueJS framework, but the same architectural approach will work with any of the other major GUI frameworks.

The tutorial aims to showcase some of the basic abstractions at the foundation of FDR and they can be used to develop an interactive application backed by a knowledge graph that gets updated based on user input. No object models is involved, but we are not working with triples either. Moreover, you will see how to integrate knowledge from the DBPedia public triplestore and augment it with application specific properties. 


## App Specs

The application is about a hypothetical global organization, with local chapters in various regions/cities where each chapter has its local office, regional lead and a number of members. Thus, some information is simply public knowledge about geographical regions which is available from DBPedia, while other is application specific and following an application specific ontology.

The overall of the application is simple:

- The user is presented with a list of regions to view & edit
- Upon selecting a region, the user see all its properties where the DBPedia ones are readonly (fixed, public knowledge) and the others can be edited. 

For simplicity, we don't make use of any fancy GUI components or pretty designs. Our purpose is to illustrate the logic flow of data and user interaction.

## Running the app

Start first by cloning and running the application:

1. git clone https://github.com/kobrixinc/fdr-tutorial.git; cd fdr-tutorial
1. npm i
1. npm run serve
1. 
