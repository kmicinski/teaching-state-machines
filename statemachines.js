// A model of a string being matched, with a pointer into the string
var MatchString = function(matchString,view) {
    this.matchString = matchString;
    
}

// States - A list of `id`, `name` objects
var StateMachineModel = function(states,transitions,start,accepting,matchString) {
    this.matchString = matchString;
}

$(function(){ // on dom ready
// Prepare Cytoscape setup for all FSMs
/*
$('#fsm').cytoscape({
  style: cytoscape.stylesheet()
    .selector('node')
      .css({
        'content': 'data(name)',
        'text-valign': 'center',
        'color': 'white',
        'text-outline-width': 2,
        'text-outline-color': '#888'
      })
    .selector('edge')
      .css({
        'target-arrow-shape': 'triangle',
        'content': 'data(label)'
      })
    .selector(':selected')
      .css({
        'background-color': 'black',
        'line-color': 'black',
        'target-arrow-color': 'black',
        'source-arrow-color': 'black'
      })
    .selector('.faded')
      .css({
        'opacity': 0.25,
        'text-opacity': 0
      }),
    
  elements: {
    nodes: [
      { data: { id: 'init', name: 'init' } },
      { data: { id: 'q0', name: 'q0' } },
      { data: { id: 'q1', name: 'q1' } },
    ],
    edges: [
      { data: { source: 'init', target: 'q0'} },
      { data: { source: 'q0', target: 'q0', label: '0'} },
      { data: { source: 'q0', target: 'q1' } },
      { data: { source: 'q1', target: 'q1' } },
      { data: { source: 'q1', target: 'q0' } }
    ]
  },
  
  layout: {
    name: 'grid',
    padding: 10
  },
  
  // on graph initial layout done (could be async depending on layout...)
  ready: function(){
    window.cy = this;
    
    // giddy up...
    cy.elements().unselectify();
    cy.elements('node#init').css({'visibility':'hidden'});
    cy.on('tap', 'node', function(e){
      var node = e.cyTarget; 
      var neighborhood = node.neighborhood().add(node);
      cy.elements().addClass('faded');
      neighborhood.removeClass('faded');
    });
    cy.on('tap', function(e){
      if( e.cyTarget === cy ){
        cy.elements().removeClass('faded');
      }
    });
  }
});*/
});

/**
 * A model of a finite state machine.  This tracks stateful
 * information about what state we're in.
 * fsm - The FSM to work with
 * workingString - The string we're working on
 */
var FSMModel = function(fsm,workingString) {
    this.fsm = fsm;
    this.currentState = fsm.init;
    this.workingString = workingString || "";
    this.workingIndex = 0;

    /*
     * State variables for interaction
     */
    this.changeListeners = [];
    
    this.POINTER_AT = 0;
    this.TRANSITION = 1;
    
    this.setWorkingIndex = function(index) {
        this.workingIndex = index;
    }

    this.reset = function() {
        this.currentState = fsm.init;
        $.each(this.changeListeners).call(POINTER_AT,0);
        this.setWorkingIndex(0);
    }
    
    this.setWorkingString = function(str) {
        this.workingString = str || "";
        this.reset();
    }

    this.input = function(arg) {
        // Bail out if we're not working on anything
        if (this.workingIndex >= this.workingString.length) {
            return;
        }
        var nextCharacter = this.workingString[this.workingIndex];
        var nextStates = [];
        if (arg.toState) {
            nextStates = this.fsm.transitions.filter(function(e,i) {
                return (e.f == this.currentState
                        && e.t == arg.toState);
            })
        } else if (arg.input) {
            nextStates = this.fsm.transitions.filter(function(e,i) {
                return (e.f == this.currentState
                        && e.i == arg.input);
            })
        }
        nextStates = nextStates.filter(function(x) { x.i == nextCharacter });
        
        var gotoState = nextStates[0];
        if (!gotoState) { return; }
        
        
    }
    
    this.addTransitionListener =
        function(listener) { this.changeListeners.push(listener); };
}

var FSM = function(fsm) {
    for(var k in fsm) this[k]=fsm[k];
    // Add aliases for from, to, and input
    $.each(fsm.transitions,function(e) {
        e.from = e.f;
        e.to = e.t;
        e.input = e.i;
    });
}

/**
 * Thew view for a finite state machine, based on the model above.
 * The view controls the interaction and presentation to the user.
 * Given a viewScope, textArea, and a model, it will orchasterate
 * interaction to run the FSM to completion (or failure) using the
 * model.
 * 
 * viewScope - The DIV that will contain the actual graph layed out by
 * Cytoscape
 * textArea - A textArea that will contain text being worked on.
 * model - A FSMModel object
 */
var FSMView = function(viewScope,textArea,model) {

    // Convert our JSON representation to Cytoscape's
    this.getCytoElemtents = function () {
        var obj = {nodes:[],edges:[]};
        $.each(model.fsm.nodes, function(i,node) {
            obj.nodes.push({ data: { id: node[0], name: node[1] } })});
        $.each(model.fsm.transitions, function(i,t) {
            obj.edges.push({ data:
                              { source: t.f, target: t.t, label:t.i } })});
        return obj;
    }

    // Update the text area to point at the proper region
    this.updateTextArea = function(index) {
        var beginning = 
            $('<p></p>')
            .css({"background-color":"lightgreen",
                  "font-size":"200%",
                  "display":"inline"})
            .text(model.workingString.slice(0,index));
        var charAt = $('<u></u>')
            .css({"display":"inline",
                  "font-size":"200%"})
            .text(model.workingString[index]);
        var end = $('<p></p>')
            .css({"display":"inline",
                  "font-size":"200%"})
            .text(model.workingString.slice(index+1));
        textArea.html('<span></span>')
        textArea.append(beginning);
        textArea.append(charAt);
        textArea.append(end);
    } 
    
    this.updateTextArea(3);
    
    // Initialize the viewscope
    viewScope.cytoscape({
        style: cytoscape.stylesheet()
            .selector('node')
            .css({
                'content': 'data(name)',
                'text-valign': 'center',
                'color': 'white',
                'text-outline-width': 2,
                'text-outline-color': '#888'
            })
            .selector('edge')
            .css({
                'target-arrow-shape': 'triangle',
                'content': 'data(label)'
            })
            .selector('.selected')
            .css({
                'background-color': 'lightblue',
            })
            .selector('.faded')
            .css({
                'color': 'blue',                
            }),
    
        elements: this.getCytoElemtents(),
        layout: {
            name: 'breadthfirst',
            padding: 10
        },
        
        // on graph initial layout done (could be async depending on layout...)
        ready: function(){
            window.cy = this;
            
            // giddy up...
            cy.elements().unselectify();
            cy.filter('node[name="'+model.fsm.init+'"]')
                .addClass('selected');
            
            cy.on('tap', 'node', function(e){
                var node = e.cyTarget; 
                var neighborhood = node.neighborhood().add(node);
                cy.elements().addClass('faded');
                neighborhood.removeClass('faded');
            });
            cy.on('tap', function(e){
                if( e.cyTarget === cy ){
                    cy.elements().removeClass('faded');
                }
            });
        }
    });    
}

/**
 * Create a finite state machine at the given element.
 * arguments.element The element to put the state machine
 * arguments.file The JSON file to load
 * arguments.json Raw JSON for the FSM
 */
var createFSM = function(arguments) {
    var linearBox = $('<div class="fsmContainer"></div>');
    arguments.element.append(linearBox);
    
    var workStringBox = $('<p></p>')
    var viewScopeDiv = $('<div class="cViewScope"></div>');
    viewScopeDiv.css({"height":"400px","width":"400px"});
    linearBox.append(workStringBox);
    linearBox.append(viewScopeDiv);

    var model = new FSMModel(arguments.json,"10101");
    alert(model);
    var view = new FSMView(viewScopeDiv,workStringBox,model);
}
