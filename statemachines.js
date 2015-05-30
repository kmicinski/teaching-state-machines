//
// Extend jQuery with a disable function for buttons
//
jQuery.fn.extend({
    disable: function(state) {
        return this.each(function() {
            var $this = $(this);
            if($this.is('input, button'))
              this.disabled = state;
            else
              $this.toggleClass('disabled', state);
        });
    }
});

/**
 * The StateMachine constructor
 * @param name The name of the DIV containing the graph
 */
var StateMachine = function(name) {
    'use strict';
    
    var cy;
    var vd;
    var deleteButton;
    var setAcceptingButton;
    var backButton;
    var nextButton;
    var playButton;

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
        this.backContinuation;
        
        // Updates the "back" button
        this.setBackContinuation = function(c) {
            this.backContinuation = c;
            if (c === undefined) {
                backButton.disable(true);
            } else {
                backButton
                    .disable(false)
                    .click($.proxy(c,this));
            }
        }

        this.backtrackContinuation;
        this.setBacktrackContinuation = function(c) {
            this.backtrackContinuation = c;
        }

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
        
        this.ADD = 5;

        this.DONE = 6;

        /**
         * Internally set the pointer into the working string
         * @private
         */
        this.setWorkingIndex = function(index) {
            workingIndex = index;
            
            if (index >= workingString.length) {
                // Done, inform the view
                if ($.inArray(currentState, fsm.accepting) !== -1) {
                    // This is an accepting state
                    $.each(changeListeners, $.proxy(function(idx,listener) {
                        listener({ev:this.DONE,accepted:true});
                    },this));
                } else {
                    // This is not an accepting state
                    $.each(changeListeners, $.proxy(function(idx,listener) {
                        listener({ev:this.DONE,accepted:false});
                    },this));
                }
            } else {
                changeListeners.forEach(function(listener) {
                    listener({ev:this.POINTER_AT,index:workingIndex});
                }, this);
            }
        };
        
        this.getAcceptingStates = function() {
            return fsm.accepting;
        };
        
        // Call the listeners to inform them that a new node has been
        // selected
        this.selectNode = function(node) {
            currentState = node;
            $.each(changeListeners, $.proxy(function(idx,listener) {
                listener({ev:this.SELECT_NODE,node:node});
            },this));
        };
        
        this.removeNode = function(node) {
            // XXX What to do if init node?
            
            fsm.nodes = fsm.nodes.filter(function(node) {
                if (node[0] === node) { return false; } else { return true; }
            });
            fsm.transitions = fsm.nodes.filter(function(t) {
                if (t.f === node || t.t === node) {
                    return true;
                } else { return false; }
            });
            fsm.accepting = fsm.accepting.filter(function(node) {
                if (node[0] === node) { return false; } else { return true; }
            });
        };

        this.removeNode = function(node) {
            // XXX check for node hygeine
            fsm.nodes.push(node);
        };
        
        this.setNodeAccepting = function(node) {
            // XXX check node is in graph
            fsm.accepting.push(node);
        };
        
        /**
         * Tell the view to point at the next character in the
         * selection scope.  This does not create a back continuation,
         * so callers should prefer [advanceIndexSetNode] instead.
         * 
         * Note that this doesn't validate anything, so calling it
         * without verifying a transition is accurate could
         * potentially result in inconsistent results.
         */
        this.advanceIndex = function() {
            this.setWorkingIndex(workingIndex + 1);
        };

        /**
         * Advance the index, and set the next node. Note that this
         * does not validate anything, but *does* create a back
         * continuation correctly.
         */
        this.advanceIndexSetNode = function(node) {
            var wi = workingIndex;
            var cs = currentState;
            var oldBackContinuation = this.backContinuation;
            this.selectNode(node);
            this.advanceIndex();
            this.setBackContinuation(function() {
                this.setWorkingIndex(wi);
                this.selectNode(cs);
                this.setBackContinuation(oldBackContinuation);
            });
        }

        
        // Test to see if a character is in the alphabet of the automaton
        this.isCharInAlphabet = function(c) {
            if (/[a-zA-Z0-9]/.test(c)) {
                return true;
            } else {
                return false;
            }
        };
        
        // The default backtrack continuation informs the user the
        // string is not accepted.  This is called only after we have
        // exhausted all possible traversals of the state machine, and
        // now must give up
        this.defaultBacktrackContinuation = function() {
            $.each(changeListeners, $.proxy(function(idx,listener) {
                listener({ev:this.DONE,accepted:false});
            }));
        };
        
        /**
         * Reset the state machine
         */
        this.reset = function() {
            // Set everything back to the current state
            currentState = fsm.init;
            this.setWorkingIndex(0);
            this.selectNode(fsm.init);
            
            // Set the default continuations
            this.setBacktrackContinuation(this.defaultBacktrackContinuation);
            this.setBackContinuation(undefined);
            
            // XXX: why do we need this line?
            if (cy) { cy.layout(); }
        };

        // Call back the view and tell them that the user's input was invalid
        this.flashInvalid = function() {
            changeListeners.forEach(function(l) {
                l({ev:this.FLASH_INVALID});
            }, this);
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
        
        this.multipleNextChoices = function(nodes) {
            $.each(changeListeners, $.proxy(function(idx,listener) {
                listener({ev:this.MULTIPLE_CHOICES,choices:nodes});
            }, this));
        };
        
        // XXX clean up
        this.calculateNextStates = function(arg) {
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
            
            return nextStates
                .filter(function(e,i) {
                    return (e.i === nextCharacter);
                })
                .map(function(e) { return e.t; });
        }

        /**
         * Handler for when an input transition is made from the
         * keyboard.
         *
         * @param arg.input The character the user typed
         */
        this.input = function(arg) {
            // Bail out if we're not working on anything
            if (workingIndex >= workingString.length) {
                return;
            }
            var nextStates = this.calculateNextStates(arg);
            
            if (nextStates.length > 1) {
                this.multipleNextChoices(nextStates);
            } else if (nextStates.length == 1) {
                // There is a unique node to advance to
                this.advanceIndexSetNode(nextStates[0]);
            } else {
                // No posible next states
                this.flashInvalid();
            }
            
            return;
        };

        /**
         * Handler for the "next" button.  Meant to be called in an
         * animation loop.
         * 
         * The only tricky thing here is that we need to keep track of
         * the continuation for backtracking and for the "back"
         * button.
         */
        this.gotoNextState = function() {
            // Bail out if we're not working on anything
            if (workingIndex >= workingString.length) {
                return;
            }
            
            var nextCharacter = workingString[workingIndex];
            var nextStates = this.calculateNextStates({input:nextCharacter});

            if (nextStates.length === 0) {
                // No states to go to, call the backtrack continuation
                this.backtrackContinuation();
                return;
            } else if (nextStates.length === 1) {
                // Deterministic
                this.advanceIndexSetNode(nextStates[0]);
            } else {
                // Create backtracking frame: this logic is
                // complicated and should probably be cleaned up.
                // 
                // The basic idea is this: we have n next possible
                // choices (nextStates.length).  We store the set of
                // next states and an index into them.  We push a
                // continuation that tells us to go to index 1 if the
                // current path fails, and then index 2, and so on up
                // to n.  Once we reach n, we call the old
                // continuation, which will subsequently perform this
                // process for each place in the graph where we reach
                // a branch.
                // 
                // Note that for this to work correctly, we need to
                // have an initial continuation that flags an error.
                // 
                // XXX: handle the "back" pointer with this as well
                var wi = workingIndex;
                var cs = currentState;
                var oldC = this.backtrackContinuation;
                var ns = nextStates;
                var i = 1;
                var newC = 
                    function() {
                        if (i >= ns.length) {
                            // Done with this branch, call back to the
                            // previous one
                            oldC();
                        } else {
                            // Note we can't call `advance` here
                            // because this.workingIndex will have
                            // potentially changed by this point
                            this.setWorkingIndex(wi);
                            this.selectNode(ns[i]);
                        }
                    };
                this.setBacktrackContinuation(newC);
                this.advanceIndexSetNode(nextStates[0]);
            }
        }
        
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
    this.FSMView = function(viewScope,textArea,model) {
        var hasMultipleChoices = false;
        var nextNodes = [];
        
        // Continuations for view animation
        var backContinuation;
        var backtrackContinuation;
        
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
                .css({"background-color":"lightblue",
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
            case model.DONE:
                textArea.empty();
                var tag = $('<p></p>').text(model.getWorkingString())
                    .css({"display":"inline",
                          "font-size":"200%"});
                
                if (event.accepted) {
                    tag.css({"background-color":"lightgreen"});
                } else {
                    tag.css({"background-color":"lightcoral"});
                }
                textArea.append(tag);
                break;
            }
        },this));

        // 
        // Stuff for multiple next node choices
        // 

        var onClickResolveNodes = function(ev) {
            vd.focus();
            var node = ev.cyTarget;
            var nodeName = node.id();

            if ($.inArray(nodeName,nextNodes) > -1) {
                // Reset the state
                hasMultipleChoices = false;
                nextNodes = [];

                // Select the node, which will subsequently call back
                // to the view to set the appropriate flags
                model.advanceIndexSetNode(nodeName);
                
                // Restore default tap callback
                cy.on('tap', 'node', $.proxy(function(e){
                    defaultOnTapHandler(e);
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
        
        // Called when the user finishes their input in the edit box
        // and wants to start a new round of running the state
        // machine.
        var finishEditboxInput = function() {
            setEditboxPlain();
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
        textArea.keyup($.proxy(function(ev) {
            var button = String.fromCharCode(ev.keyCode);
            if (textArea.hasClass("editingText")) {
                // Handle enter button
                if (ev.keyCode == 13) {
                    finishEditboxInput();
                } else {
                    if (model.addCharWorkingString(button)) {
                        // Good
                    } else { 
                        // User typed in invalid character 
                        flashInvalid();
                    } 
                }
            } else if (textArea.hasClass("selectedText")) {
                if (model.setWorkingString(button)) {
                    // Start editing
                    setEditboxEditing();
                } else {
                    // User typed in invalid character
                    flashInvalid();
                }
            }
        },this)).click((function(closure) { return (function() {
            if (textArea.hasClass("selectedText")) {
                // Selected but not edited, unselect
                setEditboxPlain();
            } else if (textArea.hasClass("editingText")) {
                // Editing, stop editing and set this as the match string
                finishEditboxInput();
            } else {
                // Not selected, select it
                setEditboxSelected();
            }
            textArea.focus();
        });})(this));
        
        this.deleteNode = function(node) {
            node.remove();
            model.removeNode(node.id());
            // remove the click handler for the delete button
            deleteButton.click(function() { return; });
            deleteButton.disable(true);
        };

        this.addNode = function(nodeName) {
            cy.add({group:"nodes",data:{id:"q3"}});
            model.addNode(nodeName);
        };
        
        // 
        // Default handler for on tap nodes
        // 
        var defaultOnTapHandler = function(e) {
            vd.focus();
            var node = e.cyTarget; 
            deleteButton.click(deleteNode.bind(this,e.cyTarget));
            deleteButton.disable(false);
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
                    'border-color': 'black',
                    'border-width': '1',
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
                    'border-style': 'double',
                    'border-width': '2',
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
                    cy.elements().removeClass('selected').removeClass('faded');
                    
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
                    defaultOnTapHandler(e);
                });
            }); })(viewScope,model)))});

        // Reset the model
        model.reset();
    },

    /**
     * Create a finite state machine at the given element.
     * @param arguments.element elem The element to put the state machine
     * @param arguments.file URL The JSON file to load
     * @param arguments.json JSON Raw JSON for the FSM
     * @param arguments.editControls bool Put editing controls at the
     * bottom of the div?
     * @param arguments.playControls bool Put animation controls at the
     * bottom of the div?
     */
    this.createFSM = function(args) {
        // Create the model
        var model = new this.FSMModel(args.json,"10101");
        
        // Create a box to put everythin in
        var linearBox =
            $('<div class="fsmContainer"></div>')
            .css({"width":"400px","padding":"5px"});
        args.element.append(linearBox);
        var topContentBox = $('<div></div>');
        // Create the box that displays the working string
        var workStringBox =
            $('<div style="display:inline;" tabindex="-1"></p>');
        var resetButton = $('<button>Reset</button>').css(
            {"display":"inline","float":"right","margin":"5px"})
            .addClass("btn")
            .addClass("btn-default");
        
        // Create the cytoscape view div
        vd = $('<div class="cViewScope" tabindex="0"></div>');
        vd.css({"height":"400px","width":"400px"});
        
        // Activate the reset button
        resetButton.click(function() {
            model.reset();
            vd.focus();
        });

        // Add a bunch of auxiliary buttons for editing things and
        // interacting
        var bottomBox  = $('<div></div>');
        
        // Edit controls
        var editControls = $('<span></span>')
            .css({"display":"inline","float":"right","margin":"5px"});
        var newButton = $('<button>New</button>').css(
            {"display":"inline","float":"right","margin":"5px"})
            .addClass("btn")
            .addClass("btn-default")
            .click($.proxy(this.addNode,view));

        deleteButton = $('<button>Delete</button>').css(
            {"display":"inline","float":"right","margin":"5px"})
            .addClass("btn")
            .addClass("btn-default").disable(true);
        setAcceptingButton = $('<button>Accepting</button>').css(
            {"display":"inline","float":"right","margin":"5px"})
            .addClass("btn")
            .addClass("btn-default").disable(true);

        topContentBox.append(workStringBox);
        topContentBox.append(resetButton);

        editControls.append(newButton);
        editControls.append(deleteButton);
        editControls.append(setAcceptingButton);

        // Play controls
        var playControls = $('<span></span>')
            .css({"display":"inline","float":"left","margin":"5px"});
        
        backButton = $('<button>Back</button>').css(
            {"display":"inline","float":"left","margin":"5px"})
            .addClass("btn")
            .addClass("btn-default")
            .click($.proxy(this.addNode,view)).disable(true);

        playButton = $('<button>Play</button>').css(
            {"display":"inline","float":"left","margin":"5px"})
            .addClass("btn")
            .addClass("btn-default").disable(false);

        nextButton = $('<button>Next</button>').css(
            {"display":"inline","float":"left","margin":"5px"})
            .addClass("btn")
            .addClass("btn-default")
            .disable(false)
            .click($.proxy(model.gotoNextState,model));
        
        playControls
            .append(backButton)
            .append(playButton)
            .append(nextButton);
        
        linearBox.append(topContentBox);
        linearBox.append(vd);

        var view = new this.FSMView(vd,workStringBox,model);

        if (args.editControls) {
            // Append editing controls
            bottomBox.append(editControls);
        }
        if (args.playControls) {
            bottomBox.append(playControls);
        }
        linearBox.append(bottomBox);
    };
};
