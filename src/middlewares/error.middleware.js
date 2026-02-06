const errorHandler = (err,req,res,next)=>{
   const statusCode = err.statusCode || 500
   const message = err.message || "internal server error"

   res.status(statusCode).json({
    success:false,
    message
   })
}

// err.stack for exact debug when ur lost 
export default errorHandler