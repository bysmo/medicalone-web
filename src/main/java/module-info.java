module com.altes.alphacure {
    requires javafx.controls;
    requires javafx.fxml;


    opens com.altes.alphacure to javafx.fxml;
    exports com.altes.alphacure;
}