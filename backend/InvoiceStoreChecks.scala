object InvoiceStoreChecks:
  def main(args: Array[String]): Unit =
    val store = new InvoiceStore(Vector.empty)
    val first = store.create(NewInvoice("Demo Vendor", "FV/TEST/1", BigDecimal("125.20"), "2026-12-01"))
    assert(first.isRight, "Creating a valid invoice should work")
    assert(store.list().length == 1)

    val duplicate = store.create(NewInvoice("Another", "fv/test/1", BigDecimal("10"), "2026-12-02"))
    assert(duplicate.isLeft, "Invoice numbers must be unique, ignoring case")

    val invalid = store.create(NewInvoice("A", "123", BigDecimal("0"), "not-a-date"))
    assert(invalid.isLeft, "Invalid invoices must be rejected")

    val created = first.toOption.get
    val approved = store.changeStatus(created.id, InvoiceStatus.Approved)
    assert(approved.exists(_.status == InvoiceStatus.Approved))
    assert(store.changeStatus(999, InvoiceStatus.Rejected).isEmpty)
    println("InvoiceStore checks passed")

