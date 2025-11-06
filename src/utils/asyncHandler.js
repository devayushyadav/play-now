// Approch 1 using try catch

// const asyncHandler = () => {}
// const asyncHandler = (func) => {}
// const asyncHandler = (func) => {()=> {}}
// const asyncHandler = (func) => ()=> {}
// const asyncHandler = (func) => async ()=> {}

const asyncHandler = (func) => async (req, res, next) => {
  try {
    await func(req, res, next);
  } catch (error) {
    res.status(error.code || 500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
    next(error);
  }
};

// Approch 2 using promise
const asyncHandlerPromise = (func) => {
  (req, res, next) => {
    Promise.resolve(func(req, res, next)).reject(next);
  };
};

export { asyncHandler };
