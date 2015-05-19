# StateMachines.js

A JavaScript library for developing, animating, and teaching finite
state machines.  The library builds atop Cytoscape.js to do rendering
for the underlying graph structure.

## Setting up a state machine

To set up a state machine, you get a dom element, a JSON file (or raw
JSON), and call createFSM with the specified element:

    var cy = createFSM({
      container: document.getElementById('myfsm'),
      file: 
      }
    });

### Options

CreateFSM also takes multiple options as its input:

    - 
    - 

## Default key input buttons

  - `<enter>` while in editing mode for match string (the text being
    matched against, at the top right) sets the match string and
    resets the machine.
  - `n` Adds a new node to the graph
  - 

## Creating a new state machine

## Adding new nodes
 
## JSON output


