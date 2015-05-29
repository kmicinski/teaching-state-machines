# StateMachines.js

Open `index.html` for an example.

A JavaScript library for developing, animating, and teaching finite
state machines.  The library builds atop Cytoscape.js to do rendering
for the underlying graph structure.

## Setting up a state machine

To set up a state machine, you get a dom element, a JSON file (or raw
JSON), and call createFSM with the specified element:

    var cy = createFSM({
      element: $('.fsm');,
      json: model
      }
    });

### Options

CreateFSM also takes multiple options as its input:

    - 
    - etc... more stuff here..

## Default key input buttons

  - `<enter>` while in editing mode for match string (the text being
    matched against, at the top right) sets the match string and
    resets the machine.
  - characers move the state
  - `n` Adds a new node to the graph (**not implemented**)

## Creating a new state machine

## Adding new nodes
 
## JSON output


