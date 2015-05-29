var StateMachines = function() {
    'use strict';
//    if (typeof(this) !== StateMachines) {
//        return new StateMachines();
//    }

    // Create a unique div
    this.createUniqueDiv = function() {
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
        this.SELECT_NODE = 2;
        this.FLASH_INVALID = 3;
        
        this.setWorkingIndex = function(index) {
            this.workingIndex = index;
        };
        
        this.getAcceptingStates = function() {
            return this.fsm.accepting;
        };

        this.reset = function() {
            this.currentState = fsm.init;
            this.setWorkingIndex(0);
            $.each(this.changeListeners, $.proxy(function(idx,listener) {
                listener({ev:this.POINTER_AT,index:0});
            },this));
        };
        
        // Call the listeners to inform them that a new node has been
        // selected
        this.selectNode = function(node) {
            this.currentState = node;
            $.each(this.changeListeners, $.proxy(function(idx,listener) {
                listener({ev:this.SELECT_NODE,node:node});
            },this));
        };
        
        this.advanceIndex = function() {
            this.workingIndex += 1;
            $.each(this.changeListeners, $.proxy(function(idx,listener) {
                listener({ev:this.POINTER_AT,index:this.workingIndex});
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
        
        this.flashInvalid = function() {
            $.each(this.changeListeners, $.proxy(function(idx,listener) {
                listener({ev:this.FLASH_INVALID});
            }, this));
        };

        // Set the working string for the model, returns false if
        // characters inside str are outside of the alphabet.
        this.setWorkingString = function(str) {
            function arrays_equal(a,b) { return !!a && !!b && !(a<b || b<a); }
            if (arrays_equal(str.split("").filter(this.isCharInAlphabet), str.split(""))) {
                this.workingString = str || "";
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
                this.workingString = this.workingString + c;
                this.reset();
                return true;
            } else {
                return false;
            }
        };
        
        // Take a step in the state machine.
        this.input = function(arg) {
            // Bail out if we're not working on anything
            if (this.workingIndex >= this.workingString.length) {
                return;
            }
            var currentState = this.currentState;
            var nextCharacter = this.workingString[this.workingIndex];
            var nextStates = [];
            if (arg.toState) {
                nextStates = this.fsm.transitions.filter(function(e,i) {
                    return (e.f == currentState &&
                            e.t == arg.toState);
                });
            } else if (arg.input) {
                nextStates = this.fsm.transitions.filter(function(e,i) {
                    return (e.f == currentState &&
                            e.i == arg.input);
                });
            }
            
            nextStates = nextStates.filter(function(e,i) {
                return (e.i === nextCharacter);
            });
            
            var gotoState = nextStates[0];
            // No possible node to go to 
            if (!gotoState) { this.flashInvalid(); return; }
            
            // Call back to the view to update state
            this.advanceIndex();
            this.selectNode(gotoState.t);
        };
        
        this.addTransitionListener =
            function(listener) { this.changeListeners.push(listener); };
    };

    this.FSM = function(fsm) {
        for(var k in fsm) this[k]=fsm[k];
        // Add aliases for from, to, and input
        $.each(fsm.transitions,function(e) {
            e.from = e.f;
            e.to = e.t;
            e.input = e.i;
        });
    };

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
    this.FSMView = function(viewScope,textArea,resetButton,model) {

        // Convert our JSON representation to Cytoscape's
        this.getCytoElemtents = function () {
            var obj = {nodes:[],edges:[]};
            $.each(model.fsm.nodes, function(i,node) {
                obj.nodes.push({ data: { id: node[0], name: node[1] } });});
            $.each(model.fsm.transitions, function(i,t) {
                obj.edges.push({ data:
                                 { source: t.f, target: t.t, label:t.i } });});
            return obj;
        };

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
            textArea.empty();
            textArea.append([beginning,charAt,end]);
        };

        // Add callbacks from model
        model.addTransitionListener($.proxy(function(event) {
            switch (event.ev) {
            // Refactor so doesn't refer to model
            case model.POINTER_AT:
                this.updateTextArea(event.index);
                break;
            case model.RESET:
            }
        },this));

        // Manipulating the edit text box
        this.setEditboxPlain = function() {
            textArea.removeClass("editingText");
            textArea.removeClass("selectedText");
        };
        
        this.setEditboxEditing = function() {
            textArea.addClass("editingText");
            textArea.removeClass("selectedText");
        };
        
        this.setEditboxSelected = function() {
            textArea.addClass("selectedText");
            textArea.removeClass("editingText");
        };
        
        resetButton.click(function() {
            return;
        });

        // Called when the user finishes their input in the edit box
        // and wants to start a new round of running the state
        // machine.
        this.finishEditboxInput = function() {
            this.setEditboxPlain();
        };

        // Constructor code
        this.flashInvalid = function() {
            var col = textArea.css("color");
            var opa = textArea.css("opacity");
            textArea.animate({color:"red",opacity:"1.0"},100,function() { textArea.animate({color:col,opacity:opa},100);});
        };

        model.addTransitionListener($.proxy(function(event) {
            switch (event.ev) {
            case model.FLASH_INVALID:
                this.flashInvalid();
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
        
        // Initialize the viewscope
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
                    'color': 'blue',                
                }),
            
            elements: this.getCytoElemtents(),
            layout: {
                name: 'breadthfirst',
                padding: 10
            },
            
            // on graph initial layout done (could be async depending on layout...)
            ready: (((function(viewScopeDiv,m) { return (function() {
                window.cy = this;
                
                // giddy up...
                cy.elements().unselectify();
                
                // Highlight initial node and accepting nodes
                cy.filter('node[name="'+model.fsm.init+'"]')
                    .addClass('selected');
                $.each(model.fsm.accepting, function(i,nodeName) {
                    cy.filter('node[name="'+nodeName+'"]').addClass('accepting'); });
                
                viewScopeDiv.focus();
                viewScopeDiv.keyup(function(key) {
                    var button = String.fromCharCode(key.keyCode);
                    // Give the input to the model, it will call back
                    // the appropriate thing to set the current node.
                    model.input({input:button});
                });
                
                var selectNode = function(nodeName) {
                    //cy.elements().unselectify();
                    cy.elements().removeClass('selected').removeClass('accepting');
                    
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
                    case m.POINTER_AT:
                        // Do nothing here, handled elsewhere
                        break;
                    case m.SELECT_NODE:
                        // Transition to highlight a new node
                        selectNode(event.node);
                    }
                },this));
                
                cy.on('tap', 'node', function(e){
                    var node = e.cyTarget; 
                    var neighborhood = node.neighborhood().add(node);
                    cy.elements().addClass('faded');
                    neighborhood.removeClass('faded');
                });
                cy.on('tap', function(e){
                    viewScopeDiv.focus();
                    if( e.cyTarget === cy ){
                        cy.elements().removeClass('faded');
                    }
                });
            }) })(viewScope,model)))});

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
