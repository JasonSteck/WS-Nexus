module.exports = function(args) {
  const hash = {};
  let lastFlag = null;

  args.forEach(a => {
    if(a.startsWith('-')) {
      lastFlag = a.slice(1);
    } else if(lastFlag) {
      hash[lastFlag] = a;
      lastFlag = null;
    }
  });

  return hash;
}
