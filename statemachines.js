/**
 * The StateMachine constructor
 * @param name The name of the DIV containing the graph
 */
var StateMachine = function(name) {
    'use strict';
    
    var cy;

//    if (typeof(this) !== StateMachine) {
//        return new StateMachine(name);
//    }

    // Create a unique div
    var createUniqueDiv = function() {
        var div = $('<div></div>');
        div.id = "div_" + new Date().getTime().toString();
        return div;
    };
    
    /**
     * A model of a finite state machine.  This tracks stateful
     * information about what state we're in.
     * fsm - The FSM to work with
     * workingString - The string we're working on
     */
    this.FSMModel = function(fsm,workingString) {
        // fsm = function(fsm) {
        //     for(var k in fsm) this[k]=fsm[k];
        //     // Add aliases for from, to, and input
        //     $.each(fsm.transitions,function(e) {
        //         e.from = e.f;
        //         e.to = e.t;
        //         e.input = e.i;
        //     });
        // };

        this.getFsm = function() { return fsm; };
        this.getWorkingString = function() { return workingString; };

        /**
         * @private The current state of the FSM
         */
        var currentState = fsm.init;
        this.getCurrentState = function() { return currentState; };
        
        /**
         * @private The working index into the working string
         */
        var workingIndex = 0;
        this.getWorkingIndex = function() { return workingIndex; };

        /*
         * State variables for interaction
         */
        var changeListeners = [];
        
        //
        // Enums for various events that callbacks can handle
        //
        
        /** 
         * The [POINTER_AT] index calls back with an object of type
         * {ev:POINTER_AT,index:number} 
         * Where index specifies the current index into the working string
         */
        this.POINTER_AT = 0;
        
        /**
         * [SELECT_NODE] specifies a callback with an object of type
         * {ev:POINTER_AT,node:String} 
         * Where string is the node identifier of the node within the graph
         */
        this.SELECT_NODE = 2;
        
        /**
         * [FLASH_INVALID] specifies that the user input an invalid
         * character, it's sort of a leaky abstraction, but it's
         * intended for the view to flash in some way to represent to
         * alert the user that they did something bad.
         * {ev:FLASH_INVALID} 
         */
        this.FLASH_INVALID = 3;

        /**
         * [MULTIPLE_CHOICES] specifies that previous input resulted
         * in a choice of multiple possible next node
         * {ev:FLASH_INVALID,node:string list} 
         */
        this.MULTIPLE_CHOICES = 4;
        
        /**
         * Internally set the pointer into the working string
         * @private
         */
        var setWorkingIndex = function(index) {
            workingIndex = index;
        };
        
        this.getAcceptingStates = function() {
            return fsm.accepting;
        };
        
        // Call the listeners to inform them that a new node has been
        // selected
        this.selectNode = function(node) {
            this.currentState = node;
            $.each(changeListeners, $.proxy(function(idx,listener) {
                listener({ev:this.SELECT_NODE,node:node});
            },this));
        };
        
        /**
         * Tell the view to point at the next character in the
         * selection scope.
         * 
         * Note that this doesn't validate anything, so calling it
         * without verifying a transition is accurate could
         * potentially result in inconsistent results.
         */
        this.advanceIndex = function() {
            workingIndex += 1;
            $.each(changeListeners, $.proxy(function(idx,listener) {
                listener({ev:this.POINTER_AT,index:workingIndex});
            }, this));
        };

        // Test to see if a character is in the alphabet of the automaton
        this.isCharInAlphabet = function(c) {
            if (/[a-zA-Z0-9]/.test(c)) {
                return true;
            } else {
                return false;
            }
        };
        

        this.reset = function() {
            this.currentState = fsm.init;
            setWorkingIndex(0);
            $.each(changeListeners, $.proxy(function(idx,listener) {
                listener({ev:this.POINTER_AT,index:0});
            },this));
            this.selectNode(fsm.init);
            
        };

        // Call back the view and tell them that our choice was invalid
        this.flashInvalid = function() {
            $.each(changeListeners, $.proxy(function(idx,listener) {
                listener({ev:this.FLASH_INVALID});
            }, this));
        };

        // Set the working string for the model, returns false if
        // characters inside str are outside of the alphabet.
        this.setWorkingString = function(str) {
            function arrays_equal(a,b) { return !!a && !!b && !(a<b || b<a); }
            if (arrays_equal(str.split("").filter(this.isCharInAlphabet), str.split(""))) {
                workingString = str || "";
                this.reset();
                return true;
            } else {
                return false;
            }
        };
        
        // Add a single character to the working string.  Return false
        // if character not in alphabet.
        this.addCharWorkingString = function(c) {
            if (this.isCharInAlphabet(c)) {
                workingString = workingString + c;
                this.reset();
                return true;
            } else {
                return false;
            }
        };

        
        /** 
         * When the user has a choice of multiple next steps, resolve
         * it and choose the next node.
         */
        this.resolveNodeChoice = function(node) {
            // Jump to the next character in the displayed text box
            this.advanceIndex();
            this.selectNode(node);
        };

        this.multipleNextChoices = function(nodes) {
            $.each(changeListeners, $.proxy(function(idx,listener) {
                listener({ev:this.MULTIPLE_CHOICES,choices:nodes});
            }, this));
        };
        
        // Take a step in the state machine.
        this.input = function(arg) {
            // Bail out if we're not working on anything
            if (workingIndex >= workingString.length) {
                return;
            }
            var currentState = this.currentState;
            var nextCharacter = workingString[workingIndex];
            var nextStates = [];
            if (arg.toState) {
                nextStates = fsm.transitions.filter(function(e,i) {
                    return (e.f == currentState &&
                            e.t == arg.toState);
                });
            } else if (arg.input) {
                nextStates = fsm.transitions.filter(function(e,i) {
                    return (e.f == currentState &&
                            e.i == arg.input);
                });
            }
            
            nextStates = nextStates.filter(function(e,i) {
                return (e.i === nextCharacter);
            });
            
            if (nextStates.length > 1) {
                this.multipleNextChoices(nextStates.map(function(e) { return e.t; }));
            } else if (nextStates.length == 1) {
                // There is a unique node to advance to
                this.advanceIndex();
                this.selectNode(nextStates[0].t);
            } else {
                // No posible next states
                this.flashInvalid();
            }

            return;
            
        };
        
        this.addTransitionListener =
            function(listener) { changeListeners.push(listener); };
    };

    /**
     * Thew view for a finite state machine, based on the model above.
     * The view controls the interaction and presentation to the user.
     * Given a viewScope, textArea, and a model, it will orchasterate
     * interaction to run the FSM to completion (or failure) using the
     * model.
     * 
     * @param viewScope The DIV that will contain the actual graph layed out by
     * Cytoscape
     * @param textArea A textArea that will contain text being worked on.
     * @param model A FSMModel object representing the FSM being driven
     */
    this.FSMView = function(viewScope,textArea,resetButton,model) {
        var hasMultipleChoices = false;
        var nextNodes = [];

        /**
         * Get the underlying model back.  Useful for if the user can
         * update the FSM
         */
        this.getModel = function() { return model; };

        
        var getCytoElemtents = function () {
            var obj = {nodes:[],edges:[]};
            $.each(model.getFsm().nodes, function(i,node) {
                obj.nodes.push({ data: { id: node[0], name: node[1] } });});
            $.each(model.getFsm().transitions, function(i,t) {
                obj.edges.push({ data:
                                 { source: t.f, target: t.t, label:t.i } });});
            return obj;
        };

        // Update the text area to point at the proper region
        var updateTextArea = function(index) {
            var beginning = 
                $('<p></p>')
                .css({"background-color":"lightgreen",
                      "font-size":"200%",
                      "display":"inline"})
                .text(model.getWorkingString().slice(0,index));
            var charAt = $('<u></u>')
                .css({"display":"inline",
                      "font-size":"200%"})
                .text(model.getWorkingString()[index]);
            var end = $('<p></p>')
                .css({"display":"inline",
                      "font-size":"200%"})
                .text(model.getWorkingString().slice(index+1));
            textArea.empty();
            textArea.append([beginning,charAt,end]);
        };

        // Add callbacks from model
        model.addTransitionListener($.proxy(function(event) {
            switch (event.ev) {
            // Refactor so doesn't refer to model
            case model.POINTER_AT:
                updateTextArea(event.index);
                break;
            }
        },this));

        // 
        // Stuff for multiple next node choices
        // 

        var onClickResolveNodes = function(ev) {
            var node = ev.cyTarget;
            var nodeName = node.id();

            if ($.inArray(nodeName,nextNodes) > -1) {
                // Reset the state
                hasMultipleChoices = false;
                nextNodes = [];

                // Select the node, which will subsequently call back
                // to the view to set the appropriate flags
                model.selectNode(nodeName);
                
                // Dangerously advancing index here
                model.advanceIndex();

                // Restore default tap callback
                cy.on('tap', 'node', $.proxy(function(e){
                    defaultOnTopHandler(e);
                },this));
            } else {
                // Do nothing
            }
        };

        /**
         * Called when the user selected a next node, but there were
         * multiple possibilities.  Put the view in a state so that
         * only the next possible nodes are highlighted, and
         * clickable.
         */
        var setMultipleChoices = function(nodes) {
            nextNodes = nodes;
            var hasMultipleChoices = true;
            
            cy.elements('node').addClass('faded');
            
            nodes.forEach(function(e) {
                cy.elements('node#'+e).removeClass('faded').addClass('nextNode');
            });
            
            // Set the tap callback
            cy.on('tap', 'node', $.proxy(function(e){
                onClickResolveNodes(e);
            },this));
        };

        model.addTransitionListener($.proxy(function(ev) {
            switch (ev.ev) {
            // Refactor so doesn't refer to model
            case model.MULTIPLE_CHOICES:
                setMultipleChoices(ev.choices);
                break;
            }
        }),this);
        
        // 
        // Edit box utilities
        // 
        
        var setEditboxPlain = function() {
            textArea.removeClass("editingText");
            textArea.removeClass("selectedText");
        };
        
        var setEditboxEditing = function() {
            textArea.addClass("editingText");
            textArea.removeClass("selectedText");
        };
        
        var setEditboxSelected = function() {
            textArea.addClass("selectedText");
            textArea.removeClass("editingText");
        };
        
        resetButton.click(function() {
            model.reset();
        });
        
        // Called when the user finishes their input in the edit box
        // and wants to start a new round of running the state
        // machine.
        var finishEditboxInput = function() {
            this.setEditboxPlain();
        };

        var flashInvalid = function() {
            var col = textArea.css("color");
            var opa = textArea.css("opacity");
            textArea.animate({color:"red",opacity:"1.0"},100,function() { textArea.animate({color:col,opacity:opa},100);});
        };

        model.addTransitionListener($.proxy(function(event) {
            switch (event.ev) {
            case model.FLASH_INVALID:
                flashInvalid();
                break;
            }
        },this));
        

        textArea.html('<div tabindex="1"></div>');
        textArea.keyup((function(closure) { return (function(ev) {
            var button = String.fromCharCode(ev.keyCode);
            if (textArea.hasClass("editingText")) {
                // Handle enter button
                if (ev.keyCode == 13) {
                    closure.finishEditboxInput();
                } else {
                    if (model.addCharWorkingString(button)) {
                        // Good
                    } else { 
                        // User typed in invalid character 
                        closure.flashInvalid();
                    } 
                }
            } else if (textArea.hasClass("selectedText")) {
                if (model.setWorkingString(button)) {
                    // Start editing
                    closure.setEditboxEditing();
                } else {
                    // User typed in invalid character
                    closure.flashInvalid();
                }
            }
        });}(this))).click((function(closure) { return (function() {
            if (textArea.hasClass("selectedText")) {
                // Selected but not edited, unselect
                closure.setEditboxPlain();
            } else if (textArea.hasClass("editingText")) {
                // Editing, stop editing and set this as the match string
                closure.finishEditboxInput();
            } else {
                // Not selected, select it
                closure.setEditboxSelected();
            }
            textArea.focus();
        });})(this));
        
        // 
        // Default handler for on tap nodes
        // 
        var defaultOnTopHandler = function(e) {
            // Do nothing... 
            // var node = e.cyTarget; 
            // var neighborhood = node.neighborhood().add(node);
            // cy.elements().addClass('faded');
            // neighborhood.removeClass('faded');
        };

        // 
        // Initialize the Cytoscape view with the necessary stuff
        // 
        viewScope.cytoscape({
            style: cytoscape.stylesheet()
                .selector('node')
                .css({
                    'background-color': 'lightgrey',
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
                .selector('.accepting')
                .css({
                    'background-color': 'lightgreen',
                })
                .selector('.accepting')
                .css({
                    'background-color': 'lightgreen',
                })
                .selector('.faded')
                .css({
                    'opacity': '.5'
                })
                .selector('.nextNode')
                .css({
                    'background-color': 'lightpurple'
                }),

            
            elements: getCytoElemtents(),
            layout: {
                name: 'breadthfirst',
                padding: 10
            },
            
            // on graph initial layout done (could be async depending on layout...)
            ready: (((function(viewScopeDiv,m) { return (function() {
                cy = this;
                
                // giddy up...
                cy.elements().unselectify();
                
                // Highlight initial node and accepting nodes
                cy.filter('node[name="'+model.getFsm().init+'"]')
                    .addClass('selected');
                $.each(model.getFsm().accepting, function(i,nodeName) {
                    cy.filter('node[name="'+nodeName+'"]').addClass('accepting'); });
                
                viewScopeDiv.focus();
                viewScopeDiv.keyup(function(key) {
                    var button = String.fromCharCode(key.keyCode);
                    // Give the input to the model, it will call back
                    // the appropriate thing to set the current node.
                    model.input({input:button});
                });
               
                // Redraw graph
                var selectNode = function(nodeName) {
                    cy.elements().removeClass('selected').removeClass('accepting').removeClass('faded');
                    
                    // Highlight nodes as accepting unless they are
                    // the highlighted ones
                    model.getAcceptingStates().forEach(function(node) {
                        if (node !== nodeName) {
                            cy.elements("node#"+node).addClass('accepting');
                        }});
                    cy.elements("node#"+nodeName).addClass('selected');
                };
                
                m.addTransitionListener($.proxy(function(event) {
                    switch (event.ev) {
                    case m.SELECT_NODE:
                        // Transition to highlight a new node
                        selectNode(event.node);
                    }
                },this));
                
                cy.on('tap', 'node', function(e){
                    defaultOnTopHandler(e);
                });
            }); })(viewScope,model)))});

        // Reset the model
        model.reset();
    },

    /**
     * Create a finite state machine at the given element.
     * arguments.element The element to put the state machine
     * arguments.file The JSON file to load
     * arguments.json Raw JSON for the FSM
     */
    this.createFSM = function(args) {
        var linearBox = $('<div class="fsmContainer"></div>').css({"width":"400px","padding":"5px"});
        args.element.append(linearBox);
        var topContentBox = $('<div></div>');
        
        var workStringBox = $('<div style="display:inline;" tabindex="-1"></p>');
        var resetButton = $('<button>Reset</button>').css(
            {"display":"inline","float":"right","margin":"5px"})
            .addClass("btn")
            .addClass("btn-default");
        var viewScopeDiv = $('<div class="cViewScope" tabindex="0"></div>');
        viewScopeDiv.css({"height":"400px","width":"400px"});
        topContentBox.append(workStringBox);
        topContentBox.append(resetButton);
        linearBox.append(topContentBox);
        linearBox.append(viewScopeDiv);
        
        var model = new this.FSMModel(args.json,"10101");
        var view = new this.FSMView(viewScopeDiv,workStringBox,resetButton,model);
    };
};
