// Production entry point. Set NODE_ENV before loading the compiled app so the
// environment schema's production safeguards cannot fail open when a process
// manager forgets to inject it.
process.env.NODE_ENV = 'production';

require('../dist/src/main.js');
