import scala.util.Try

object InvoiceApi extends cask.MainRoutes:
  private val store = new InvoiceStore()

  private def respond(value: ujson.Value, status: Int = 200): cask.Response[String] =
    cask.Response(
      ujson.write(value),
      statusCode = status,
      headers = Seq("Content-Type" -> "application/json; charset=utf-8")
    )

  private def error(message: String, status: Int = 400): cask.Response[String] =
    respond(ujson.Obj("error" -> message), status)

  @cask.get("/api/health")
  def health(): cask.Response[String] = respond(ujson.Obj("status" -> "ok", "service" -> "invoiceflow-api"))

  @cask.get("/api/invoices")
  def invoices(): cask.Response[String] =
    respond(ujson.Arr.from(store.list().map(_.toJson)))

  @cask.post("/api/invoices")
  def create(request: cask.Request): cask.Response[String] =
    Try {
      val body = ujson.read(request.text())
      NewInvoice(
        vendor = body("vendor").str,
        invoiceNumber = body("invoiceNumber").str,
        amount = BigDecimal(body("amount").num.toString),
        dueDate = body("dueDate").str
      )
    }.toEither match
      case Left(_) => error("Invalid invoice data. Check vendor, invoice number, amount and due date.")
      case Right(input) =>
        store.create(input) match
          case Left(message) => error(message)
          case Right(invoice) => respond(invoice.toJson, 201)

  @cask.route("/api/invoices/:invoiceId/status", methods = Seq("patch"))
  def updateStatus(invoiceId: Int, request: cask.Request): cask.Response[String] =
    val parsed = Try(ujson.read(request.text())("status").str).toOption.flatMap(InvoiceStatus.fromApi)
    parsed match
      case None => error("Status must be pending, approved or rejected.")
      case Some(status) =>
        store.changeStatus(invoiceId, status) match
          case None => error("Invoice not found.", 404)
          case Some(updated) => respond(updated.toJson)

  initialize()

