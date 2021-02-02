# LR Tutor functions

These function can be used to interact with the automaton.
They are usually bound to specific buttons on the page.
If specific actions should not be possible do not add buttons for these actions.
Beware the functions could still be called from the console, so you may even want to change the 
javascript and remove these functions completely.

## function setGrammar(string: grammar, boolean: lr0)
Parses the grammar and initializes the graph with the grammar.
If there is an error in the grammar, the error messages will be shown in *grammarErrors*.
If the graph is already initialized, this will function fail.
A new grammar cannot be set, for this the page needs to be reloaded.

## function checkGraph()
Checks the correctness of the graph and shows the found errors in *graphErrors*
The errors are only hidden if *hideErrors()* is called.

## function hideErrors()
Hides the errors found while checking the graph.

## function resetCanvas()
Resets the automaton on the canvas to the start.
Only the start state with one LR Item will be shown after.

## function deleteStates()
Deletes the selected states and edges.
Connected edges are deleted as well.
The start State cannot be deleted, as there is no way to select a new start state.

## function toggleFinalStates()
Toggles the *final* attribute on the selected States.

## function loadGraph()
Loads the graph from a file. A File Window is opened to select the graph file.

## function saveGraph()
Creates a save file for the graph and a save dialog is opened.
The generated file can be loaded again with *loadGraph()*

# HTML IDs

These are ids for html elements.
The need to be set for an element, otherwise some functions fail.
They are used to hide or show specific elements, or to place custom generated content to a specific
position on the site.
The show and hide attribute is accomplished with the class *d-none*.
Do not use *visibility: hidden*, because then this element will be hidden forever.
Elements with the tag *hidden* should be hidden at the start with the class d-none.

## grammarInput
This element will be hidden after a grammar is selected.
So no further grammar input can be given.

## grammarInputButtons
This element will be hidden after a grammar is selected.
So no further grammar input can be given.
Needed so that the input buttons can be at another position in the HTML

## grammarText
This element will be shown after the grammar is selected.
It shows the grammar in form recognized by the program. 

## grammarErrors
*hidden*
Used to show errors in the grammar definition, when the user tries to input a wrong grammar.

## graphContent
*hidden*
Here resides all the functionality for the automaton creation.
It will be shown if a grammar is selected and the graph is initialized.

## graphHeading
The Heading for the graph content.
The value depends on the Lr(0/1) and will be overwritten, when a grammar is chosen.

## mxCanvas
The Position for the canvas of the automaton.
It should have the style *overflow: auto*, such that automaton of any size can be shown with scrollbars.

## graphActions
An element which contains buttons to interact with the automaton while creation the automaton. 
The actions are *delete*, *toggleFinal* and selecting a transition terminal.
The element will only be shown if one of the named action is no possible, so to say, when a state is selected.

## actionDelete
*hidden*
Holds the button for the delete action.
Only shown when states or edges are selected.

## actionToggleFinal
*hidden*
Holds the button for the toggle final action.
Only shown when one or more states are selected.

## transitionTerminals
*hidden*
Holds the buttons to select a (non-)terminal for the transition.
These buttons are added automatically, as they depend on the grammar.
Only shown if exactly one state is selected.
This state is the start state for the transition.

## graphErrors
*hidden*
This element holds the found errors when checking the graph.
These errors are updated, when *checkGraph()* is called.
When *graphErrors* is shown *graphActions* will be hidden, so they can be at the same location
in the DOM and a do not overflow their given space.
