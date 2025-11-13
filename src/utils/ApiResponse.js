class APIResponse {
  constructor(statusCode, message = "Success", data = null) {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400 ? true : false;
  }
}

export { APIResponse };
