// since the markdown.it interface is a bit on the verbose side
// we can keep some general patterns here


export default null;

// creates a rule suitable for inline parsing and replacement
//
// example:
// const rule = inlineRegexRule(md, {
//   start: '#',
//   matcher: /^#([\w-:]{1,101})/i,
//   emitter: emitter
// });

export function inlineRegexRule(md, options) {

  const start = options.start.charCodeAt(0);
  const maxLength = (options.maxLength || 500) + 1;

  return function(state, silent) {
    const pos = state.pos;

    if (state.src.charCodeAt(pos) !== start || silent) {
      return false;
    }

    // test prev
    if (pos > 0) {
      let prev = state.src.charCodeAt(pos-1);
      if (!md.utils.isWhiteSpace(prev) && !md.utils.isPunctChar(String.fromCharCode(prev))) {
        return false;
      }
    }

    // skip if in a link
    if (options.skipInLink && state.tokens) {
      let i;
      for(i=state.tokens.length-1;i>=0;i--) {
        let token = state.tokens[i];
        let type = token.type;
        if (type === 'link_open' || (type === 'html_inline' && token.content.substr(0,2).toLowerCase() === "<a")) {
          return false;
        }
        if (type.block || type === 'link_close' || (type === 'html_inline' && token.content.substr(0,4).toLowerCase() === "</a>")) {
          break;
        }
      }
    }

    const substr = state.src.slice(pos, Math.min(pos + maxLength,state.posMax));

    const matches = options.matcher.exec(substr);
    if (!matches) {
      return false;
    }

    // got to test trailing boundary
    const finalPos = pos+matches[0].length;
    if (finalPos < state.posMax) {
      const trailing = state.src.charCodeAt(finalPos);
      if (!md.utils.isSpace(trailing) && !md.utils.isPunctChar(String.fromCharCode(trailing))) {
        return false;
      }
    }

    if (options.emitter(matches, state)) {
      state.pos = Math.min(state.posMax, finalPos);
      return true;
    }

    return false;

  };
}

// based off https://github.com/markdown-it/markdown-it-emoji/blob/master/dist/markdown-it-emoji.js
//
export function textReplace(state, callback, skipAllLinks) {
  var i, j, l, tokens, token,
        blockTokens = state.tokens,
        linkLevel = 0;

  for (j = 0, l = blockTokens.length; j < l; j++) {
    if (blockTokens[j].type !== 'inline') { continue; }
    tokens = blockTokens[j].children;

    // We scan from the end, to keep position when new tags added.
    // Use reversed logic in links start/end match
    for (i = tokens.length - 1; i >= 0; i--) {
      token = tokens[i];

      if (skipAllLinks) {
        if (token.type === 'link_open' || token.type === 'link_close') {
          linkLevel -= token.nesting;
        } else if (token.type === 'html_inline') {
          if (token.content.substr(0,2).toLowerCase() === "<a") {
            linkLevel++;
          } else if (token.content.substr(0,4).toLowerCase() === "</a>") {
            linkLevel--;
          }
        }
      } else {
        if (token.type === 'link_open' || token.type === 'link_close') {
          if (token.info === 'auto') { linkLevel -= token.nesting; }
        }
      }

      if (token.type === 'text' && linkLevel === 0) {
        let split;
        if(split = callback(token.content, state)) {
          // replace current node
          blockTokens[j].children = tokens = state.md.utils.arrayReplaceAt(
            tokens, i, split
          );
        }
      }
    }
  }
}
