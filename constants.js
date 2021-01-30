export const GRAPH_VERSION = '0.4';

//Style and type names for the different elements on the canvas
export const STYLE_STATE = 'state';
export const STYLE_FINAL_STATE = 'final';
export const STYLE_EDGE = 'edge';
export const STYLE_LR_ITEM = 'lritem';
export const STYLE_SHOW_ID = 'showid';

//Colors for the elements
export const COLOR_FONT = '#363D45';
export const COLOR_FONT_ERROR = '#FF0000';
export const COLOR_STATE = '#93E4F1';
export const COLOR_STATE_ERROR = '#F8D7DA';
export const COLOR_STATE_BORDER = '#0E606C';
export const COLOR_EDGE = '#073036';
export const COLOR_EDGE_ERROR = '#FF0000';
export const COLOR_ID = '#F8F991';
export const COLOR_BACKGROUND = '#F5F5F4';

//Set Pixel Values for States and Items
export const STATE_MARGIN = 10;
export const LRITEM_HEIGHT = 20;
export const STATE_MIN_HEIGHT = 40;
export const STATE_MIN_WIDTH = 60;

export const DOT = '•';
export const ARROW = '➜';
export const EPSILON = 'Ɛ';
export const DELIMITER = '|';
export const DOLLAR = '$';
export const START_NON_TERMINAL = "S'";
export const NOT_ALLOWED_TERMINALS = [DOT, ARROW, EPSILON, DELIMITER, DOLLAR, START_NON_TERMINAL, '->', '.', '{', '}', ','];
