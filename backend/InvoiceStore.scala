import java.time.LocalDate
import scala.util.Try

enum InvoiceStatus:
  case Pending, Approved, Rejected

  def apiValue: String = this.toString.toLowerCase

object InvoiceStatus:
  def fromApi(value: String): Option[InvoiceStatus] =
    InvoiceStatus.values.find(_.apiValue == value.toLowerCase)

case class Invoice(
    id: Int,
    vendor: String,
    invoiceNumber: String,
    amount: BigDecimal,
    dueDate: String,
    status: InvoiceStatus
):
  def toJson: ujson.Value = ujson.Obj(
    "id" -> id,
    "vendor" -> vendor,
    "invoiceNumber" -> invoiceNumber,
    "amount" -> amount.toDouble,
    "dueDate" -> dueDate,
    "status" -> status.apiValue
  )

case class NewInvoice(vendor: String, invoiceNumber: String, amount: BigDecimal, dueDate: String)

class InvoiceStore(initial: Vector[Invoice] = InvoiceStore.demoData):
  private var entries = initial
  private var nextId = initial.map(_.id).maxOption.getOrElse(0) + 1

  def list(): Vector[Invoice] = synchronized {
    entries.sortBy(_.id)(using Ordering.Int.reverse)
  }

  def create(input: NewInvoice): Either[String, Invoice] = synchronized {
    val vendor = input.vendor.trim
    val invoiceNumber = input.invoiceNumber.trim

    if vendor.length < 2 then Left("Vendor name must contain at least 2 characters.")
    else if invoiceNumber.length < 3 then Left("Invoice number must contain at least 3 characters.")
    else if input.amount <= 0 then Left("Amount must be greater than zero.")
    else if !Try(LocalDate.parse(input.dueDate)).isSuccess then Left("Due date must be a valid YYYY-MM-DD date.")
    else if entries.exists(_.invoiceNumber.equalsIgnoreCase(invoiceNumber)) then
      Left("This invoice number already exists.")
    else
      val created = Invoice(nextId, vendor, invoiceNumber, input.amount, input.dueDate, InvoiceStatus.Pending)
      entries = entries :+ created
      nextId += 1
      Right(created)
  }

  def changeStatus(id: Int, nextStatus: InvoiceStatus): Option[Invoice] = synchronized {
    entries.find(_.id == id).map { current =>
      val updated = current.copy(status = nextStatus)
      entries = entries.map(invoice => if invoice.id == id then updated else invoice)
      updated
    }
  }

object InvoiceStore:
  val demoData: Vector[Invoice] = Vector(
    Invoice(1, "Northwind Studio", "FV/2026/010", BigDecimal("2480.00"), "2026-11-12", InvoiceStatus.Pending),
    Invoice(2, "Baltic Office", "FV/2026/011", BigDecimal("750.50"), "2026-11-03", InvoiceStatus.Approved),
    Invoice(3, "Pixel Works", "FV/2026/012", BigDecimal("1399.99"), "2026-11-19", InvoiceStatus.Pending),
    Invoice(4, "Green Logistics", "FV/2026/013", BigDecimal("4120.00"), "2026-10-30", InvoiceStatus.Rejected)
  )

